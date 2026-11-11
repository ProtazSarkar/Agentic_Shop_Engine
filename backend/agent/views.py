from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.services import OrderServiceError
from .guardrails.rate_limiter import AgentChatThrottle, AgentConfirmThrottle
from .models import AgentSession
from .orchestrator import confirm_pending_action, run_agent_turn
from .serializers import (
    AgentChatRequestSerializer,
    AgentConfirmRequestSerializer,
    AgentMessageSerializer,
    AgentSessionSerializer,
)


class AgentChatView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AgentChatThrottle]

    def post(self, request):
        serializer = AgentChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = run_agent_turn(
            user=request.user,
            raw_message=serializer.validated_data.get('message', ''),
            session_id=serializer.validated_data.get('session_id'),
        )

        http_status = status.HTTP_200_OK
        return Response(
            {
                'session_id': result['session_id'],
                'blocked': result['blocked'],
                'block_reason': result['block_reason'],
                'message': AgentMessageSerializer(result['assistant_message']).data,
                'effects': result['effects'],
            },
            status=http_status,
        )


class AgentConfirmView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AgentConfirmThrottle]

    def post(self, request):
        serializer = AgentConfirmRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            result = confirm_pending_action(
                user=request.user,
                action_id=data['action_id'],
                decision=data['decision'],
                shipping_address=data.get('shipping_address'),
                shipping_method=data.get('shipping_method'),
                payment_method=data.get('payment_method'),
                notes=data.get('notes'),
            )
        except OrderServiceError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        return Response(
            {
                'status': result['status'],
                'action_id': result['action_id'],
                'session_id': result['session_id'],
                'message': AgentMessageSerializer(result['assistant_message']).data,
                'order': result['order'],
                'effects': result['effects'],
            },
            status=status.HTTP_200_OK,
        )


class AgentSessionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = AgentSession.objects.filter(id=session_id).first()
        if not session:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        if session.user_id is not None:
            if not request.user.is_authenticated or session.user_id != request.user.id:
                return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(AgentSessionSerializer(session).data, status=status.HTTP_200_OK)

