import api from "./api";

const BASE = "/api/landing-pages";

export const landingPageService = {
  list: () => api.get(BASE),
  get: (id) => api.get(`${BASE}/${id}`),
  create: (data) => api.post(BASE, data),
  update: (id, data) => api.patch(`${BASE}/${id}`, data),
  remove: (id) => api.delete(`${BASE}/${id}`),
};