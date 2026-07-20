import api from "./api";

const BASE = "/api/facebook-pages";

export const facebookPageService = {
  list: () => api.get(BASE),
  create: (pageId, pageName, pageAccessToken) =>
    api.post(BASE, { pageId, pageName, pageAccessToken }),
  updateToken: (id, pageAccessToken) => api.patch(`${BASE}/${id}`, { pageAccessToken }),
  updateName: (id, pageName) => api.patch(`${BASE}/${id}`, { pageName }),
  toggleActive: (id, isActive) => api.patch(`${BASE}/${id}`, { isActive }),
  remove: (id) => api.delete(`${BASE}/${id}`),
  getUnmatchedIds: () => api.get(`${BASE}/unmatched-ids`),
  resyncCommentNames: () => api.post(`${BASE}/resync-comment-names`),
};