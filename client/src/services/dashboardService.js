import api from "./api";

// export const dashboardService = {
//   getSummary: (from, to) => api.get("/api/dashboard/summary", { params: { from, to } }),
// };




export const dashboardService = {
  getSummary: (from, to, moderatorId) =>
    api.get("/api/dashboard/summary", { params: { from, to, moderatorId } }),
};