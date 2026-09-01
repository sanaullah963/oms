import api from "./api";

const BASE = "/api/tracking-parcels";

export const trackingParcelService = {
  getSummary: (moderatorId, from, to) =>
    api.get(`${BASE}/summary`, { params: { moderatorId, from, to } }),
  getOrders: (status, moderatorId, from, to, page, limit) =>
    api.get(`${BASE}/orders`, { params: { status, moderatorId, from, to, page, limit } }),
};