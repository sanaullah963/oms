import api from "./api";

const BASE = "/api/event-logs";

export const eventLogService = {
  list: (status, eventName, page = 1, limit = 50) =>
    api.get(BASE, { params: { status, eventName, page, limit } }),
  retry: (id) => api.post(`${BASE}/${id}/retry`),
  remove: (id) => api.delete(`${BASE}/${id}`),
  removeMany: (ids) => api.post(`${BASE}/bulk-delete`, { ids }),
};