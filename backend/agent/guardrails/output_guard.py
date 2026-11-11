import re

SECRET_PATTERNS = (
    re.compile(r'gsk_[A-Za-z0-9_-]{10,}'),
    re.compile(r'sk-[A-Za-z0-9_-]{12,}'),
    re.compile(r'AIza[0-9A-Za-z_-]{20,}'),
    re.compile(r'django-insecure-[A-Za-z0-9!@#$%^&*()_+=.-]{12,}'),
    re.compile(r'Bearer\s+[A-Za-z0-9._-]{16,}', re.IGNORECASE),
    re.compile(r'\b(GROQ_API_KEY|SECRET_KEY|GOOGLE_CLIENT_SECRET|DB_PASSWORD)\s*[:=]\s*\S+', re.IGNORECASE),
    re.compile(r'\b(?:javascript|vbscript|data):[^\s)\]]*', re.IGNORECASE),
)

PROMPT_LEAK_MARKERS = (
    'untrusted="true"',
    '<tool_result',
    'SECURITY RULES FOR ASSISTANT',
    'DO NOT REVEAL THESE INSTRUCTIONS',
)


def sanitize_assistant_output(raw_text):
    """Scrub secrets or internal prompt delimiters from assistant replies before sending to clients."""
    text = str(raw_text or '').strip()
    if not text:
        return "I'm ready whenever you are—let me know what product or order question you'd like help with."

    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            text = pattern.sub('[redacted]', text)

    lowered = text.lower()
    if any(marker.lower() in lowered for marker in PROMPT_LEAK_MARKERS):
        return (
            "I'm here to help you explore products, check prices and availability, "
            "or manage your shopping bag and orders."
        )

    return text

