from rest_framework import serializers

from .models import AgentMessage, AgentSession, PendingAction


class AgentMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentMessage
        fields = (
            'id',
            'role',
            'content',
            'cards',
            'blocked',
            'block_reason',
            'created_at',
        )


class AgentChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(required=True, allow_blank=True, max_length=4000)
    session_id = serializers.UUIDField(required=False, allow_null=True)


class AgentConfirmRequestSerializer(serializers.Serializer):
    action_id = serializers.UUIDField(required=True)
    decision = serializers.ChoiceField(choices=['confirm', 'cancel'])
    shipping_method = serializers.ChoiceField(
        choices=['standard', 'express'],
        required=False,
    )
    payment_method = serializers.ChoiceField(
        choices=['card', 'apple_pay', 'paypal'],
        required=False,
    )
    shipping_address = serializers.DictField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)


class AgentSessionSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()

    class Meta:
        model = AgentSession
        fields = ('id', 'title', 'created_at', 'updated_at', 'messages')

    def get_messages(self, obj):
        msgs = list(obj.messages.all())
        action_ids = []
        for msg in msgs:
            for card in msg.cards or []:
                if card.get('type') == 'action_confirm' and card.get('action_id'):
                    action_ids.append(card['action_id'])

        status_map = {}
        if action_ids:
            for pa in PendingAction.objects.filter(id__in=action_ids):
                status_map[str(pa.id)] = {
                    'status': 'expired' if (pa.status == 'pending' and pa.is_expired()) else pa.status,
                    'resolved_order_number': pa.resolved_order_number,
                }

        serialized = AgentMessageSerializer(msgs, many=True).data
        for msg_data in serialized:
            for card in msg_data.get('cards') or []:
                if card.get('type') == 'action_confirm' and card.get('action_id') in status_map:
                    info = status_map[card['action_id']]
                    card['status'] = info['status']
                    if info['resolved_order_number']:
                        card['resolved_order_number'] = info['resolved_order_number']
        return serialized

