import requests
from django.conf import settings


class LLMClientError(Exception):
    """Raised when the upstream language model request fails."""


class GroqClient:
    """Thin wrapper over Groq's OpenAI-compatible Chat Completions endpoint."""

    API_URL = 'https://api.groq.com/openai/v1/chat/completions'
    DEFAULT_MODEL = 'openai/gpt-oss-120b'
    FALLBACK_MODELS = ('openai/gpt-oss-20b', 'qwen/qwen3.8-27b')

    def __init__(self, api_key=None, model=None, timeout=30):
        self.api_key = api_key if api_key is not None else getattr(settings, 'GROQ_API_KEY', '')
        self.model = model or getattr(settings, 'GROQ_MODEL', '') or self.DEFAULT_MODEL
        self.timeout = timeout

    def _candidate_models(self):
        candidates = [self.model]
        for fallback in (self.DEFAULT_MODEL, *self.FALLBACK_MODELS):
            if fallback and fallback not in candidates:
                candidates.append(fallback)
        return candidates

    def create_chat_completion(self, *, messages, tools=None, temperature=0.25, max_tokens=1200):
        if not self.api_key:
            raise LLMClientError('Assistant service is not configured yet.')

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        }

        last_status = None
        for candidate_model in self._candidate_models():
            payload = {
                'model': candidate_model,
                'messages': messages,
                'temperature': temperature,
                'max_tokens': max_tokens,
            }
            if tools:
                payload['tools'] = tools
                payload['tool_choice'] = 'auto'

            try:
                response = requests.post(
                    self.API_URL,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout,
                )
            except requests.RequestException as exc:
                raise LLMClientError('Unable to reach the shopping assistant service right now.') from exc

            if response.status_code in {404, 429, 503}:
                last_status = response.status_code
                continue

            if response.status_code >= 400:
                raise LLMClientError(f'Assistant service returned status {response.status_code}.')

            try:
                data = response.json()
            except ValueError as exc:
                raise LLMClientError('Received an unreadable response from the assistant service.') from exc

            choices = data.get('choices') or []
            if not choices:
                raise LLMClientError('Assistant returned an empty response.')

            message = choices[0].get('message') or {}
            return {
                'content': message.get('content') or '',
                'tool_calls': message.get('tool_calls') or [],
            }

        raise LLMClientError(f'Assistant service returned status {last_status or 503}.')
