from rest_framework.throttling import ScopedRateThrottle


class AgentChatThrottle(ScopedRateThrottle):
    scope = 'agent_chat'


class AgentConfirmThrottle(ScopedRateThrottle):
    scope = 'agent_confirm'

