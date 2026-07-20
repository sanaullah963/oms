import { pushService } from "@/services/pushService";

// --- VAPID base64 পাবলিক কী-কে ব্রাউজারের প্রয়োজনীয় Uint8Array ফরম্যাটে রূপান্তর ---
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * সার্ভিস ওয়ার্কার রেজিস্টার করে, নোটিফিকেশন পারমিশন চায়, এবং সাবস্ক্রাইব করে সার্ভারে সেভ করে।
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function registerPushNotification() {
  if (typeof window === "undefined") return { success: false, message: "Browser environment না।" };

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, message: "এই ব্রাউজার Push Notification সাপোর্ট করে না।" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, message: "নোটিফিকেশন পারমিশন দেওয়া হয়নি।" };
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { data } = await pushService.getVapidPublicKey();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await pushService.subscribe(subscription.toJSON());
    return { success: true };
  } catch (error) {
    console.error("Push registration error:", error);
    return { success: false, message: "নোটিফিকেশন চালু করতে ব্যর্থ হয়েছে।" };
  }
}
