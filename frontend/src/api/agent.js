import { apiRequest } from './client';

export const agentApi = {
  async sendMessage({ message, sessionId = null }) {
    return apiRequest('/api/agent/chat/', {
      method: 'POST',
      body: JSON.stringify({
        message,
        session_id: sessionId || null,
      }),
    });
  },

  async confirmAction({
    actionId,
    decision,
    shippingAddress = null,
    shippingMethod = undefined,
    paymentMethod = undefined,
    notes = undefined,
  }) {
    const payload = {
      action_id: actionId,
      decision,
    };
    if (shippingAddress) payload.shipping_address = shippingAddress;
    if (shippingMethod) payload.shipping_method = shippingMethod;
    if (paymentMethod) payload.payment_method = paymentMethod;
    if (notes !== undefined) payload.notes = notes;

    return apiRequest('/api/agent/confirm/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getSession(sessionId) {
    return apiRequest(`/api/agent/sessions/${sessionId}/`);
  },
};

