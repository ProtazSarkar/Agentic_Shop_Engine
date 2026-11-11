import json
import re
from html import escape

MAX_PROMPT_CHARS = 1500

INVISIBLE_UNICODE_RE = re.compile(r'[\u200b-\u200f\u202a-\u202e\u2060\ufeff]')

INJECTION_PATTERNS = (
    (
        'instruction_override',
        re.compile(
            r'\b(ignore|disregard|forget|bypass|override)\b.{0,45}'
            r'\b(previous|prior|above|system|developer|safety|all)\b.{0,30}'
            r'\b(instructions?|prompts?|rules?|directives?|guardrails?)\b',
            re.IGNORECASE | re.DOTALL,
        ),
    ),
    (
        'system_prompt_extraction',
        re.compile(
            r'\b(reveal|show|print|dump|repeat|output|leak|expose|tell\s+me)\b.{0,45}'
            r'\b(system\s+prompt|hidden\s+instructions?|developer\s+message|'
            r'groq_api_key|api[_\s]?key|secret[_\s]?key|django[_\s]?secret|'
            r'environment\s+variables?|dotenv|\.env|credentials?)\b',
            re.IGNORECASE | re.DOTALL,
        ),
    ),
    (
        'role_hijack',
        re.compile(
            r'(^\s*(system|developer)\s*:|<\|im_start\|>|\[SYSTEM\]|</?system_prompt>)',
            re.IGNORECASE | re.MULTILINE,
        ),
    ),
    (
        'jailbreak_persona',
        re.compile(
            r'\b(you\s+are\s+now\s+(?:dan|unrestricted|root|admin)|'
            r'enter\s+(?:developer|god|unrestricted)\s+mode|'
            r'pretend\s+you\s+have\s+no\s+rules)\b',
            re.IGNORECASE,
        ),
    ),
    (
        'cross_account_or_sql_probe',
        re.compile(
            r'(\bunion\s+select\b|\bdrop\s+table\b|\bselect\s+\*\s+from\b|'
            r'\bother\s+users?\x27?s?\s+(?:orders?|carts?|emails?|accounts?|data)\b|'
            r'\ball\s+users?\x27?s?\s+(?:orders?|passwords?|tokens?|emails?)\b)',
            re.IGNORECASE,
        ),
    ),
)

SAFE_REFUSAL_MESSAGE = (
    "I can only help with browsing products, checking stock, managing your cart, "
    "and tracking or placing your own orders. How can I help you shop today?"
)


def sanitize_user_prompt(raw_text):
    """Clean incoming customer input and reject prompt-injection or exfiltration attempts."""
    if raw_text is None:
        return {
            'is_safe': False,
            'cleaned_text': '',
            'reason_code': 'empty_prompt',
            'user_message': 'Please enter a message so I can assist you.',
        }

    cleaned = INVISIBLE_UNICODE_RE.sub('', str(raw_text))
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', cleaned).strip()

    if not cleaned:
        return {
            'is_safe': False,
            'cleaned_text': '',
            'reason_code': 'empty_prompt',
            'user_message': 'Please enter a message so I can assist you.',
        }

    if len(cleaned) > MAX_PROMPT_CHARS:
        return {
            'is_safe': False,
            'cleaned_text': cleaned[:MAX_PROMPT_CHARS],
            'reason_code': 'prompt_too_long',
            'user_message': f'Please keep your message under {MAX_PROMPT_CHARS} characters.',
        }

    for reason_code, pattern in INJECTION_PATTERNS:
        if pattern.search(cleaned):
            return {
                'is_safe': False,
                'cleaned_text': cleaned,
                'reason_code': reason_code,
                'user_message': SAFE_REFUSAL_MESSAGE,
            }

    return {
        'is_safe': True,
        'cleaned_text': cleaned,
        'reason_code': '',
        'user_message': '',
    }


def escape_untrusted_text(value):
    """Neutralize XML/tag characters in database records so catalog strings cannot forge boundaries."""
    text = str(value or '')
    text = INVISIBLE_UNICODE_RE.sub('', text)
    return escape(text, quote=False)


def wrap_untrusted_data(tag_name, payload):
    """Serialize tool output inside explicit XML-style boundaries for the LLM context."""
    safe_tag = re.sub(r'[^a-zA-Z0-9_-]', '_', str(tag_name))

    def _sanitize_obj(obj):
        if isinstance(obj, str):
            return escape_untrusted_text(obj)
        if isinstance(obj, list):
            return [_sanitize_obj(item) for item in obj]
        if isinstance(obj, dict):
            return {str(k): _sanitize_obj(v) for k, v in obj.items()}
        return obj

    sanitized_payload = _sanitize_obj(payload)
    body = json.dumps(sanitized_payload, ensure_ascii=False)
    return (
        f'<{safe_tag} untrusted="true">\n'
        f'{body}\n'
        f'</{safe_tag}>'
    )

