// --- তারিখকে DD-MM-YY ফরম্যাটে রূপান্তর ---
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date)) return "Invalid Date";

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
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
