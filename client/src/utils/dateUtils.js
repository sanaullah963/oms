// --- তারিখকে DD-MM-YY ফরম্যাটে রূপান্তর ---
// export const formatDate = (dateString) => {
//   if (!dateString) return "N/A";
//   const date = new Date(dateString);
//   if (isNaN(date)) return "Invalid Date";

//   const day = date.getDate().toString().padStart(2, "0");
//   const month = (date.getMonth() + 1).toString().padStart(2, "0");
//   const year = date.getFullYear().toString().slice(-2);

//   return `${day}-${month}-${year}`;
// };




// --- তারিখকে D Mon YY ফরম্যাটে রূপান্তর ---
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  const day = date.getDate(); // কোনো leading zero নেই
  const month = date.toLocaleString("en-US", {
    month: "short",
  });
  const year = date.getFullYear().toString().slice(-2);

  return `${day}-${month}-${year}`;
};

// --- টাইমকে HH:MM (AM/PM) ফরম্যাটে দেখানোর জন্য ---
export const formatTime = (isoString) => {
  if (!isoString) return "N/A";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// --- ইংরেজি সংখ্যাকে বাংলা সংখ্যায় রূপান্তর (০-৯) ---
const toBnDigits = (num) => num.toString().replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

// --- টাইমস্ট্যাম্প থেকে "কত সময় আগে" — বাংলায় (যেমন: "১০ মিনিট আগে",
// "১ ঘণ্টা ৫ মিনিট আগে", "২৩ ঘণ্টা ৯ মিনিট আগে", "১ দিন ২ ঘণ্টা ৪ মিনিট আগে")।
// দিন/ঘণ্টা/মিনিট — যেই অংশগুলো শূন্যের বেশি, শুধু সেগুলোই দেখায়। ---
export const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date)) return "";

  const diffMs = Date.now() - date.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);

  // ভবিষ্যতের সময় হলে (ক্লায়েন্ট/সার্ভার ক্লক-স্কিউ ইত্যাদি) বা এক মিনিটের কম হলে
  if (totalMinutes < 1) return "just now";

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  // const parts = [];
  // if (days > 0) parts.push(`${toBnDigits(days)} দিন`);
  // if (hours > 0) parts.push(`${toBnDigits(hours)} ঘণ্টা`);
  // if (minutes > 0) parts.push(`${toBnDigits(minutes)} মিনিট`);

  // return `${parts.join(" ")} আগে`;

    const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return `${parts.join(" ")} ago`;
};