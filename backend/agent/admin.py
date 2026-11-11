from django.contrib import admin

from .models import AgentMessage, AgentSession, PendingAction, ToolAuditLog


@admin.register(AgentSession)
class AgentSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'updated_at')
    search_fields = ('id', 'user__email', 'title')


@admin.register(AgentMessage)
class AgentMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'role', 'blocked', 'block_reason', 'created_at')
    list_filter = ('role', 'blocked')


@admin.register(PendingAction)
class PendingActionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action_type', 'status', 'resolved_order_number', 'expires_at')
    list_filter = ('action_type', 'status')


@admin.register(ToolAuditLog)
class ToolAuditLogAdmin(admin.ModelAdmin):
    list_display = ('tool_name', 'user', 'risk_tier', 'outcome', 'latency_ms', 'created_at')
    list_filter = ('outcome', 'risk_tier', 'tool_name')

