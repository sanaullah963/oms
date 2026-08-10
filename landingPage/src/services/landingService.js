import api, { API_URL } from "./api";
import { getTrackingPayloadWithFingerprint } from "@/utils/tracking";

const BASE = "/api/public/landing-pages";

export const landingService = {
  getBySlug: (slug) => api.get(`${BASE}/${slug}`),
  submitOrder: async (slug, data) => {
    const tracking = await getTrackingPayloadWithFingerprint(slug);
    return api.post(`${BASE}/${slug}/order`, { ...data, tracking });
  },
};

// সার্ভার কম্পোনেন্টে ব্যবহারের জন্য (SEO/metadata + প্রথম রেন্ডার) — সরাসরি fetch দিয়ে
export async function fetchLandingPageServerSide(slug) {
  try {
    const res = await fetch(`${API_URL}${BASE}/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.page;
  } catch (error) {
    return null;
  }
}