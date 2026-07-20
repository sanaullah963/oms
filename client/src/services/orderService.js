import api from "./api";

const BASE = "/api/orders";

export const orderService = {
  getAll: () => api.get(BASE),

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
};
