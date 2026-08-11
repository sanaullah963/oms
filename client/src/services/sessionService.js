import api from "./api";

const BASE = "/api/sessions";

export const sessionService = {
  getSummary: (from, to, landingPageSlug) =>
    api.get(`${BASE}/summary`, { params: { from, to, landingPageSlug } }),
  list: (params) => api.get(BASE, { params }),
};