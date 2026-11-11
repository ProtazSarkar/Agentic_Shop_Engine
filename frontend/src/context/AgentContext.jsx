import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { agentApi } from '../api/agent';
import { ApiError, BackendUnavailableError } from '../api/client';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';

const SESSION_STORAGE_KEY = 'ase_agent_session_id';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Welcome to Atelier Concierge. Tell me what you're looking for, ask about stock or specs, or let me manage your bag and checkout.",
  cards: [],
  blocked: false,
};

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const { refreshCart } = useCart();
  const { pushToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_STORAGE_KEY) || null);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [sending, setSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (!sessionId) {
      setMessages([WELCOME_MESSAGE]);
      return () => {
        active = false;
      };
    }

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return () => {
        active = false;
      };
    }

    agentApi
      .getSession(sessionId)
      .then((data) => {
        if (!active) return;
        const loaded = Array.isArray(data?.messages) ? data.messages : [];
        if (loaded.length > 0) {
          setMessages(loaded);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setSessionId(null);
          setMessages([WELCOME_MESSAGE]);
        }
      });

    return () => {
      active = false;
    };
  }, [sessionId, user?.id]);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  const startNewSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionId(null);
    setMessages([WELCOME_MESSAGE]);
  }, []);

  const sendMessage = useCallback(
    async (rawText) => {
      const trimmed = String(rawText || '').trim();
      if (!trimmed || sending) return null;

      const optimisticUserMsg = {
        id: `local-user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        cards: [],
        blocked: false,
      };
      setMessages((prev) => [...prev, optimisticUserMsg]);
      setSending(true);

      try {
        const res = await agentApi.sendMessage({
          message: trimmed,
          sessionId,
        });

        if (res.session_id && res.session_id !== sessionId) {
          skipNextFetchRef.current = true;
          setSessionId(res.session_id);
          localStorage.setItem(SESSION_STORAGE_KEY, res.session_id);
        } else if (res.session_id) {
          localStorage.setItem(SESSION_STORAGE_KEY, res.session_id);
        }

        if (res.message) {
          setMessages((prev) => [...prev, res.message]);
        }

        if (res.effects?.cart_updated) {
          await refreshCart();
        }
        return res;
      } catch (err) {
        const fallbackText =
          err instanceof BackendUnavailableError
            ? 'Our concierge service is momentarily unavailable. Please try again shortly.'
            : err?.message || 'Unable to process your request right now. Please try again.';

        setMessages((prev) => [
          ...prev,
          {
            id: `local-err-${Date.now()}`,
            role: 'assistant',
            content: fallbackText,
            cards: [],
            blocked: false,
          },
        ]);
        return null;
      } finally {
        setSending(false);
      }
    },
    [sending, sessionId, refreshCart]
  );

  const submitConfirmation = useCallback(
    async ({ actionId, decision, shippingAddress, shippingMethod, paymentMethod, notes }) => {
      if (!isAuthenticated) {
        pushToast('Please sign in to complete your order.', 'info');
        return { requiresAuth: true };
      }
      setConfirmingId(actionId);
      try {
        const res = await agentApi.confirmAction({
          actionId,
          decision,
          shippingAddress,
          shippingMethod,
          paymentMethod,
          notes,
        });

        setMessages((prev) => {
          const updated = prev.map((msg) => {
            if (!Array.isArray(msg.cards) || msg.cards.length === 0) return msg;
            return {
              ...msg,
              cards: msg.cards.map((card) =>
                card.type === 'action_confirm' && card.action_id === actionId
                  ? {
                      ...card,
                      status: res.status,
                      resolved_order_number: res.order?.order_number || '',
                    }
                  : card
              ),
            };
          });
          return res.message ? [...updated, res.message] : updated;
        });

        if (res.effects?.cart_updated) {
          await refreshCart();
        }

        if (res.status === 'confirmed' && res.order?.order_number) {
          pushToast(`Order ${res.order.order_number} placed!`, 'success');
        } else if (res.status === 'cancelled') {
          pushToast('Checkout request cancelled.', 'info');
        }

        return { ok: true, result: res };
      } catch (err) {
        pushToast(err?.message || 'Could not update confirmation.', 'error');
        return { ok: false, error: err };
      } finally {
        setConfirmingId(null);
      }
    },
    [isAuthenticated, pushToast, refreshCart]
  );

  return (
    <AgentContext.Provider
      value={{
        isOpen,
        sessionId,
        messages,
        sending,
        confirmingId,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        startNewSession,
        sendMessage,
        submitConfirmation,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error('useAgent must be used inside AgentProvider');
  }
  return ctx;
}
