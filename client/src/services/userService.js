import api from "./api";

const BASE = "/api/users";

export const userService = {
  list: () => api.get(BASE),
  setApproval: (id, isApproved) => api.patch(`${BASE}/${id}/approve`, { isApproved }),
  setRole: (id, role) => api.patch(`${BASE}/${id}/role`, { role }),
  // মডারেটরের পারমিশন সেট — permissions: { "<key>": true/false } (শুধু পাঠানো key গুলো বদলায়)
  setPermissions: (id, permissions) => api.patch(`${BASE}/${id}/permissions`, { permissions }),
  remove: (id) => api.delete(`${BASE}/${id}`),
};
