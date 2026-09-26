import api from "./api";

const BASE = "/api/orders";

export const orderService = {
  getAll: () => api.get(BASE),

  // মাস্টার সার্চ — parcel/order ID, courier.trackingId, বা ফোন নম্বর দিয়ে
  masterSearch: (q) => api.get(`${BASE}/master-search`, { params: { q } }),
  masterEdit: (id, payload) => api.patch(`${BASE}/${id}/master-edit`, payload),
  // মাস্টার সার্চ থেকে activities লগের একটা নির্দিষ্ট এন্ট্রির description এডিট
  editActivity: (id, activityIndex, description) =>
    api.patch(`${BASE}/${id}/activity-edit`, { activityIndex, description }),
  // কাস্টমারের সব কুরিয়ার মিলিয়ে history (HTTP — socket না)
  getCourierHistory: (id) => api.post(`${BASE}/${id}/courier-history`),

  // OrderCard-এর নোট সেকশন (HTTP — socket না, আগে socket.emit("addNote") দিয়ে হতো)
  addNote: (orderId, note) => api.patch(`${BASE}/${orderId}/note`, { note }),

  createManual: (rawInputText) => api.post(`${BASE}/manual-single`, { rawInputText }),

  update: (orderId, formData) => api.put(`${BASE}/update-order/${orderId}`, formData),

  remove: (orderId) => api.delete(`${BASE}/delete/${orderId}`),

  // OrderCard-এর স্ট্যাটাস শর্টকাট বাটন (HTTP — socket না, আগে socket.emit("updateStatus") দিয়ে হতো)
  updateStatus: (orderId, newStatus, note) =>
    api.patch(`${BASE}/${orderId}/status`, { newStatus, note }),

  markAttentionResolved: (orderId) =>
    api.patch(`${BASE}/update-need-attention/${orderId}`),

  // Note বাবলের তিনটা বাটন — action: "solve" | "failed" | "try_next"
  noteAction: (orderId, action) =>
    api.patch(`${BASE}/${orderId}/note-action`, { action }),

  // Note বাবলের "আগের অর্ডার" মডেলের জন্য — একই কাস্টমারের আগের অর্ডার লিস্ট
  getPreviousOrders: (orderId) => api.get(`${BASE}/${orderId}/previous-orders`),

  schedule: (orderId, scheduledDate, noteText) =>
    api.patch(`${BASE}/order-schedule/${orderId}`, { scheduledDate, noteText }),

  bookSteadfast: (orderId) => api.post(`${BASE}/courier/steadfast/${orderId}`),

  bookSteadfastBulk: (orderIds) =>
    api.post(`${BASE}/courier/steadfast-bulk`, { orders_ids: orderIds }),

  // ফ্রড/ডুপ্লিকেট ডিটেকশন — action: 'approve' | 'ignore' | 'block'
  reviewFraud: (orderId, action, reason) =>
    api.patch(`${BASE}/${orderId}/fraud-review`, { action, reason }),
  getFraudMatches: (orderId) => api.get(`${BASE}/${orderId}/fraud-matches`),

  // ড্যাশবোর্ডের COD গরমিল টেবিল — আমাদের totalCOD-কে কুরিয়ারের ডেলিভারড COD দিয়ে সেট করে দেয়
  fixCodMismatch: (orderId) => api.patch(`${BASE}/${orderId}/fix-cod-mismatch`),
};