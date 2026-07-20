import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const TOKEN_STORAGE_KEY = "oms_auth_token";

const api = axios.create({
  baseURL: API_URL,
});

// --- প্রতিটা রিকোয়েস্টে সেভ করা JWT টোকেন যোগ করা ---
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// --- টোকেন মেয়াদোত্তীর্ণ/ইনভ্যালিড হলে লগইন পেজে পাঠানো ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
