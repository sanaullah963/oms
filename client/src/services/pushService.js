import api from "./api";

const BASE = "/api/push";

export const pushService = {
  getVapidPublicKey: () => api.get(`${BASE}/vapid-public-key`),
  subscribe: (subscription) => api.post(`${BASE}/subscribe`, subscription),
  unsubscribe: (endpoint) => api.post(`${BASE}/unsubscribe`, { endpoint }),
};
