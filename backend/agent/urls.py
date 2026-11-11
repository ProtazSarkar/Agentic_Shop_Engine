from django.urls import path

from .views import AgentChatView, AgentConfirmView, AgentSessionDetailView

urlpatterns = [
    path('chat/', AgentChatView.as_view(), name='agent-chat'),
    path('confirm/', AgentConfirmView.as_view(), name='agent-confirm'),
    path('sessions/<uuid:session_id>/', AgentSessionDetailView.as_view(), name='agent-session-detail'),
]

