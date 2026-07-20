import api from "./api";

const BASE = "/api/auth";

export const authService = {
  signup: (name, phone, password) => api.post(`${BASE}/signup`, { name, phone, password }),
  login: (phone, password) => api.post(`${BASE}/login`, { phone, password }),
  getMe: () => api.get(`${BASE}/me`),
};
