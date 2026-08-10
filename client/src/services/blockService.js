import api from "./api";

const BASE = "/api/blocked-customers";

export const blockService = {
  getAll: () => api.get(BASE),

  create: (data) => api.post(BASE, data),

  blockFromOrder: (orderId, reason) => api.post(`${BASE}/from-order/${orderId}`, { reason }),

  unblock: (id) => api.patch(`${BASE}/${id}/unblock`),
};
