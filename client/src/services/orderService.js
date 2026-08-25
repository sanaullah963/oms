import api from "./api";

const BASE = "/api/orders";

export const orderService = {
  getAll: () => api.get(BASE),

  // মাস্টার সার্চ — parcel/order ID, courier.trackingId, বা ফোন নম্বর দিয়ে
  masterSearch: (q) => api.get(`${BASE}/master-search`, { params: { q } }),

  createManual: (rawInputText) => api.post(`${BASE}/manual-single`, { rawInputText }),

  update: (orderId, formData) => api.put(`${BASE}/update-order/${orderId}`, formData),

  remove: (orderId) => api.delete(`${BASE}/delete/${orderId}`),

  markAttentionResolved: (orderId) =>
    api.patch(`${BASE}/update-need-attention/${orderId}`),

  schedule: (orderId, scheduledDate, noteText) =>
    api.patch(`${BASE}/order-schedule/${orderId}`, { scheduledDate, noteText }),

  bookSteadfast: (orderId) => api.post(`${BASE}/courier/steadfast/${orderId}`),

  bookSteadfastBulk: (orderIds) =>
    api.post(`${BASE}/courier/steadfast-bulk`, { orders_ids: orderIds }),

  // ফ্রড/ডুপ্লিকেট ডিটেকশন — action: 'approve' | 'ignore' | 'block'
  reviewFraud: (orderId, action, reason) =>
    api.patch(`${BASE}/${orderId}/fraud-review`, { action, reason }),
  getFraudMatches: (orderId) => api.get(`${BASE}/${orderId}/fraud-matches`),
};
