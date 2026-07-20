// --- অর্ডার তৈরির তারিখ অনুযায়ী গ্রুপ করা ---
export const groupOrdersByDate = (orders) => {
  return orders.reduce((acc, order) => {
    const timestamp = order?.activities?.[0]?.timestamp;
    if (!timestamp) return acc; // ইনভ্যালিড অর্ডার স্কিপ
    const dateKey = new Date(timestamp).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {});
};

// --- সর্বশেষ আপডেটের তারিখ অনুযায়ী গ্রুপ করা ---
export const groupOrdersByLastUpdatedDate = (orders) => {
  return orders.reduce((acc, order) => {
    const last = order?.activities?.[order?.activities?.length - 1]?.timestamp;
    if (!last) return acc;
    const dateKey = new Date(last).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {});
};

// --- একই ফোন নম্বরে একাধিক (২+) সক্রিয় অর্ডার আছে কিনা খুঁজে বের করা ---
export const multupleOrderCheck = (orders) => {
  const targetStatuses = ["Phone Off", "Call Not Received", "Pending", "Custom"];
  const phoneCounts = {};

  orders.forEach((order) => {
    if (targetStatuses.includes(order.orderStatus)) {
      order.castomerPhone.forEach((phone) => {
        if (phone) {
          phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;
        }
      });
    }
  });

  const duplicatePhones = {};
  for (const phone in phoneCounts) {
    if (phoneCounts[phone] >= 2) {
      duplicatePhones[phone] = phoneCounts[phone];
    }
  }

  return duplicatePhones;
};
