import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class AgentSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agent_sessions',
    )
    title = models.CharField(max_length=160, default='Shopping Concierge')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)

    def __str__(self):
        owner = self.user.email if self.user_id else 'guest'
        return f'{self.id} ({owner})'


class AgentMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]

    session = models.ForeignKey(
        AgentSession,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    cards = models.JSONField(default=list, blank=True)
    tool_events = models.JSONField(default=list, blank=True)
    blocked = models.BooleanField(default=False)
    block_reason = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at', 'id')

    def __str__(self):
        return f'[{self.role}] {self.content[:48]}'


class PendingAction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Confirmation'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AgentSession,
        on_delete=models.CASCADE,
        related_name='pending_actions',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='agent_pending_actions',
    )
    action_type = models.CharField(max_length=40, default='checkout')
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    resolved_order_number = models.CharField(max_length=64, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f'{self.action_type}:{self.id} ({self.status})'


class ToolAuditLog(models.Model):
    OUTCOME_CHOICES = [
        ('allowed', 'Allowed'),
        ('denied', 'Denied'),
        ('blocked_input', 'Blocked Input'),
        ('error', 'Error'),
    ]

    session = models.ForeignKey(
        AgentSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agent_audit_logs',
    )
    tool_name = models.CharField(max_length=80)
    risk_tier = models.CharField(max_length=20, default='LOW')
    arguments_sanitized = models.JSONField(default=dict, blank=True)
    outcome = models.CharField(max_length=24, choices=OUTCOME_CHOICES)
    reason = models.CharField(max_length=240, blank=True)
    latency_ms = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.tool_name} -> {self.outcome} ({self.risk_tier})'

