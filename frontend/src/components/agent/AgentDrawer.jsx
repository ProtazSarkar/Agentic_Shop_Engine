import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useAgent } from '../../context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { AgentMessage } from './AgentMessage';

const SUGGESTIONS = [
  'Wireless headphones under $260',
  'Workspace desk essentials',
  'Show my shopping bag',
  'Help me check out',
];

export function AgentDrawer() {
  const {
    isOpen,
    messages,
    sending,
    confirmingId,
    closeDrawer,
    startNewSession,
    sendMessage,
    submitConfirmation,
  } = useAgent();
  const { isAuthenticated } = useAuth();
  const [draft, setDraft] = useState('');
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, sending, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft('');
    await sendMessage(text);
  }

  return (
    <div className="drawer-backdrop" onClick={closeDrawer} role="presentation">
      <aside
        className="drawer agent-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Atelier Shopping Concierge"
      >
        <div className="drawer__header agent-drawer__header">
          <div className="agent-drawer__title">
            <span className="agent-drawer__badge">
              <Sparkles size={15} />
            </span>
            <div>
              <h2>Shopping Concierge</h2>
              <span>
                {isAuthenticated ? 'Personal Shopping & Order Care' : 'Catalog Discovery Assistant'}
              </span>
            </div>
          </div>

          <div className="agent-drawer__head-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={startNewSession}
              title="Start new conversation"
              aria-label="Start new conversation"
            >
              <RotateCcw size={17} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={closeDrawer}
              aria-label="Close assistant"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="agent-drawer__feed" ref={feedRef}>
          {messages.map((msg) => (
            <AgentMessage
              key={msg.id}
              message={msg}
              confirmingId={confirmingId}
              onConfirmAction={submitConfirmation}
              onNavigate={closeDrawer}
            />
          ))}

          {sending && (
            <div className="agent-msg agent-msg--assistant">
              <div className="agent-bubble agent-bubble--typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 2 && (
          <div className="agent-drawer__suggestions">
            {SUGGESTIONS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chip"
                onClick={() => sendMessage(prompt)}
                disabled={sending}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form className="agent-drawer__composer" onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask for recommendations, stock, or checkout..."
            maxLength={1500}
            aria-label="Message shopping concierge"
          />
          <button
            type="submit"
            className="btn btn--primary agent-drawer__send"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </aside>
    </div>
  );
}

