import api from "./api";

const BASE = "/api/event-logs";

export const eventLogService = {
  list: (status, eventName, page = 1) =>
    api.get(BASE, { params: { status, eventName, page } }),
  retry: (id) => api.post(`${BASE}/${id}/retry`),
};