import time

from django.db import transaction

from orders.serializers import OrderSerializer
from orders.services import OrderServiceError, execute_checkout, preview_checkout
from .guardrails.input_guard import sanitize_user_prompt
from .guardrails.output_guard import sanitize_assistant_output
from .guardrails.tool_guard import MAX_TOOL_CALLS_PER_TURN, RISK_HIGH, sanitize_audit_args
from .models import AgentMessage, AgentSession, PendingAction, ToolAuditLog
from .prompts import build_system_prompt
from .tools.registry import dispatch_tool, get_groq_tools_schema
from .llm_client import GroqClient, LLMClientError


def _resolve_session(user, session_id=None):
    resolved_user = user if (user and user.is_authenticated) else None

    if session_id:
        existing = AgentSession.objects.filter(id=session_id).first()
        if existing:
            # Never allow another user to hijack an owned session; attach unclaimed guest sessions upon login.
            if existing.user_id is None:
                if resolved_user is not None:
                    existing.user = resolved_user
                    existing.save(update_fields=['user', 'updated_at'])
                return existing
            if resolved_user is not None and existing.user_id == resolved_user.id:
                return existing

    return AgentSession.objects.create(user=resolved_user)


def _merge_cards(existing_cards, new_cards):
    """Deduplicate/keep latest meaningful cards generated during the turn."""
    merged = list(existing_cards)
    for card in new_cards:
        card_type = card.get('type')
        if card_type in {'cart_summary', 'action_confirm'}:
            merged = [c for c in merged if c.get('type') != card_type]
        elif card_type == 'product_list':
            merged = [c for c in merged if c.get('type') != 'product_list']
        merged.append(card)
    return merged


def run_agent_turn(*, user, raw_message, session_id=None, llm_client=None):
    """Process one user turn with input guardrails, grounded Groq tool calls, and output filtering."""
    session = _resolve_session(user, session_id=session_id)
    resolved_user = user if (user and user.is_authenticated) else None

    guard_result = sanitize_user_prompt(raw_message)
    cleaned_input = guard_result['cleaned_text']

    if not guard_result['is_safe']:
        reason = guard_result['reason_code']
        refusal = guard_result['user_message']
        user_msg = AgentMessage.objects.create(
            session=session,
            role='user',
            content=cleaned_input or str(raw_message or '')[:500],
            blocked=True,
            block_reason=reason,
        )
        assistant_msg = AgentMessage.objects.create(
            session=session,
            role='assistant',
            content=refusal,
            blocked=True,
            block_reason=reason,
        )
        ToolAuditLog.objects.create(
            session=session,
            user=resolved_user,
            tool_name='input_guard',
            risk_tier='LOW',
            arguments_sanitized={'reason': reason},
            outcome='blocked_input',
            reason=reason,
            latency_ms=0,
        )
        return {
            'session_id': str(session.id),
            'blocked': True,
            'block_reason': reason,
            'user_message': user_msg,
            'assistant_message': assistant_msg,
            'effects': {},
        }

    if session.title == 'Shopping Concierge' and cleaned_input:
        session.title = cleaned_input[:72]
        session.save(update_fields=['title', 'updated_at'])

    user_msg = AgentMessage.objects.create(
        session=session,
        role='user',
        content=cleaned_input,
    )

    recent_history = list(
        session.messages.exclude(id=user_msg.id)
        .filter(blocked=False)
        .order_by('-created_at', '-id')[:8]
    )
    recent_history.reverse()

    user_name = ''
    if resolved_user:
        user_name = resolved_user.get_full_name() or resolved_user.email

    llm_messages = [
        {
            'role': 'system',
            'content': build_system_prompt(
                is_authenticated=bool(resolved_user),
                user_display_name=user_name,
            ),
        }
    ]
    for msg in recent_history:
        if msg.role in {'user', 'assistant'}:
            llm_messages.append({'role': msg.role, 'content': msg.content})
    llm_messages.append({'role': 'user', 'content': cleaned_input})

    client = llm_client or GroqClient()
    tools_schema = get_groq_tools_schema()

    cards = []
    tool_events = []
    effects = {}
    call_count = 0
    assistant_raw_reply = ''

    try:
        for _ in range(MAX_TOOL_CALLS_PER_TURN + 1):
            completion = client.create_chat_completion(
                messages=llm_messages,
                tools=tools_schema,
            )
            tool_calls = completion.get('tool_calls') or []
            content = completion.get('content') or ''

            if not tool_calls:
                assistant_raw_reply = content
                break

            llm_messages.append(
                {
                    'role': 'assistant',
                    'content': content,
                    'tool_calls': tool_calls,
                }
            )

            for tc in tool_calls:
                fn = tc.get('function') or {}
                fn_name = fn.get('name', '')
                fn_args = fn.get('arguments', '{}')
                dispatch = dispatch_tool(
                    fn_name,
                    fn_args,
                    user=user,
                    session=session,
                    call_index=call_count,
                )
                call_count += 1

                cards = _merge_cards(cards, dispatch.get('cards', []))
                effects.update(dispatch.get('effects', {}))
                tool_events.append(
                    {
                        'tool': fn_name,
                        'outcome': dispatch.get('outcome'),
                        'reason': dispatch.get('reason'),
                    }
                )

                llm_messages.append(
                    {
                        'role': 'tool',
                        'tool_call_id': tc.get('id', f'call_{call_count}'),
                        'content': dispatch['tool_content'],
                    }
                )
        else:
            assistant_raw_reply = (
                "I've gathered the latest store details for you above. "
                "Let me know which item you'd like to explore next."
            )
    except LLMClientError as exc:
        assistant_raw_reply = str(exc)

    safe_reply = sanitize_assistant_output(assistant_raw_reply)
    assistant_msg = AgentMessage.objects.create(
        session=session,
        role='assistant',
        content=safe_reply,
        cards=cards,
        tool_events=tool_events,
    )

    return {
        'session_id': str(session.id),
        'blocked': False,
        'block_reason': '',
        'user_message': user_msg,
        'assistant_message': assistant_msg,
        'effects': effects,
    }


def confirm_pending_action(
    *,
    user,
    action_id,
    decision,
    shipping_address=None,
    shipping_method=None,
    payment_method=None,
    notes=None,
):
    """Execute or cancel a high-risk PendingAction only after explicit authenticated confirmation."""
    start = time.monotonic()

    if decision not in {'confirm', 'cancel'}:
        raise OrderServiceError('decision must be confirm or cancel.')

    with transaction.atomic():
        pending = (
            PendingAction.objects.select_for_update()
            .filter(id=action_id, user=user)
            .first()
        )
        if not pending:
            raise OrderServiceError('Confirmation request was not found.', status_code=404)

        if pending.status != 'pending':
            raise OrderServiceError(f'This checkout request has already been {pending.status}.')

        if pending.is_expired():
            pending.status = 'expired'
            pending.save(update_fields=['status', 'updated_at'])
            raise OrderServiceError('This checkout confirmation expired. Ask the assistant to prepare a new one.')

        if decision == 'cancel':
            pending.status = 'cancelled'
            pending.save(update_fields=['status', 'updated_at'])

            msg = AgentMessage.objects.create(
                session=pending.session,
                role='assistant',
                content='Order placement was cancelled. Your bag remains unchanged.',
            )
            ToolAuditLog.objects.create(
                session=pending.session,
                user=user,
                tool_name='confirm_checkout',
                risk_tier=RISK_HIGH,
                arguments_sanitized={'action_id': str(pending.id), 'decision': 'cancel'},
                outcome='denied',
                reason='user_cancelled',
                latency_ms=int((time.monotonic() - start) * 1000),
            )
            return {
                'status': 'cancelled',
                'action_id': str(pending.id),
                'session_id': str(pending.session_id),
                'assistant_message': msg,
                'order': None,
                'effects': {},
            }

        payload = dict(pending.payload or {})
        effective_method = shipping_method or payload.get('shipping_method', 'standard')
        effective_payment = payment_method or payload.get('payment_method', 'card')
        effective_notes = notes if notes is not None else payload.get('notes', '')
        effective_address = shipping_address if isinstance(shipping_address, dict) else payload.get('shipping_address')

        preview = preview_checkout(
            user,
            shipping_method=effective_method,
            payment_method=effective_payment,
            shipping_address=effective_address,
            notes=effective_notes,
        )
        if preview['missing_address_fields']:
            missing_labels = ', '.join(f.replace('_', ' ') for f in preview['missing_address_fields'])
            raise OrderServiceError(
                f'Please complete your shipping details before confirming ({missing_labels}).'
            )

        order = execute_checkout(
            user,
            shipping_method=effective_method,
            payment_method=effective_payment,
            shipping_address=preview['shipping_address'],
            notes=effective_notes,
        )
        order_data = OrderSerializer(order).data

        pending.status = 'confirmed'
        pending.resolved_order_number = order.order_number
        pending.payload = preview
        pending.save(update_fields=['status', 'resolved_order_number', 'payload', 'updated_at'])

        msg = AgentMessage.objects.create(
            session=pending.session,
            role='assistant',
            content=f'Order {order.order_number} is confirmed! Total charged: ${order.total_amount}.',
            cards=[
                {
                    'type': 'order_confirmation',
                    'order': {
                        'id': order_data['id'],
                        'order_number': order_data['order_number'],
                        'status': order_data['status'],
                        'total_amount': str(order_data['total_amount']),
                        'shipping_method': order_data['shipping_method'],
                        'items': [
                            {
                                'product_name': item['product']['name'],
                                'quantity': item['quantity'],
                                'line_total': str(item['line_total']),
                            }
                            for item in order_data.get('items', [])
                        ],
                    },
                }
            ],
        )

        ToolAuditLog.objects.create(
            session=pending.session,
            user=user,
            tool_name='confirm_checkout',
            risk_tier=RISK_HIGH,
            arguments_sanitized=sanitize_audit_args(
                {'action_id': str(pending.id), 'order_number': order.order_number}
            ),
            outcome='allowed',
            reason='confirmed_and_placed',
            latency_ms=int((time.monotonic() - start) * 1000),
        )

        return {
            'status': 'confirmed',
            'action_id': str(pending.id),
            'session_id': str(pending.session_id),
            'assistant_message': msg,
            'order': order_data,
            'effects': {'cart_updated': True},
        }
