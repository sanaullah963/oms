// --- তারিখকে YYYY-MM-DD ফরম্যাটে (API-তে পাঠানোর জন্য) ---
export function toISODate(date) {
  return date.toISOString().split("T")[0];
}

// --- প্রিসেট (আজ/গতকাল/৩দিন/৭দিন/৩০দিন/১বছর) থেকে from-to ডেট বের করা ---
export function getPresetRange(preset) {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case "today":
      break;
    case "yesterday":
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
      break;
    case "3d":
      from.setDate(from.getDate() - 2);
      break;
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      break;
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      break;
    default:
      break;
  }
  return { from: toISODate(from), to: toISODate(to) };
}
