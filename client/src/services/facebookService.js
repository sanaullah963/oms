import api from "./api";

const BASE = "/api/facebook";

export const facebookService = {
  getComments: () => api.get(`${BASE}/comments`),

  reply: (commentId, replyMessage) => api.post(`${BASE}/reply`, { commentId, replyMessage }),

  deleteFromFacebook: (commentId) => api.delete(`${BASE}/comment/${commentId}`),

  deleteAndBlock: (commentId, senderId) =>
    api.post(`${BASE}/delete-and-block`, { commentId, senderId }),

  blockUser: (senderId, commentId) => api.post(`${BASE}/block-user`, { senderId, commentId }),

  hardDeleteFromDb: (targetId) => api.delete(`${BASE}/db-comment-delete/${targetId}`),

  // --- haha/angry রিয়েক্ট দিলে অটো-ব্লক হওয়া ইউজারদের লিস্ট ---
  getBlockedReactors: () => api.get(`${BASE}/blocked-reactors`),
  deleteBlockedReactor: (id) => api.delete(`${BASE}/blocked-reactors/${id}`),
  unblockReactor: (id) => api.post(`${BASE}/blocked-reactors/${id}/unblock`),
};