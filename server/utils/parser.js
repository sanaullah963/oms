const BANGLA_TO_ENGLISH_DIGITS = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/**
 * ইনপুট টেক্সট থেকে কাস্টমারের নাম ও ফোন নম্বর পার্স করার ফাংশন।
 *
 * @param {string} rawText - কাস্টমার মেসেজ থেকে কপি করা মূল টেক্সট।
 * @returns {object} - পার্স করা ডেটা ধারণকারী একটি অবজেক্ট।
 */
function parseOrderDetails(rawText) {
  const data = {
    castomerName: "N/A",
    castomerPhone: ["N/A"],
  };

  // --- প্রস্তুতি: ডেটা পরিষ্কার করা ---
  let cleanedText = rawText
    .replace(/\[\d{2}\/\d{2}, \d{1,2}:\d{2} (am|pm)\] [a-zA-Z0-9\s]*?:/g, "") // WhatsApp ট্যাগ সরান
    .replace(/\n\s*\n/g, "\n") // একাধিক নতুন লাইন একটিতে পরিণত করা
    .trim();

  // --- ১. ফোন নম্বর বের করা ---
  const PHONE_REGEX = /(?:\+?88)?\s*((?:01|০১)(?:[\s.-]*[0-9০-৯]){9})/g;
  const matches = [...cleanedText.matchAll(PHONE_REGEX)];
  let detectedNumbers = [];

  if (matches.length > 0) {
    detectedNumbers = matches.map((match) => {
      let num = match[1];
      let cleanNum = num
        .replace(/[\s.-]/g, "")
        .replace(/[০-৯]/g, (d) => BANGLA_TO_ENGLISH_DIGITS[d]);
      return cleanNum;
    });
    // ইউনিক নম্বরগুলো রাখা (ডুপ্লিকেট এড়াতে)
    data.castomerPhone = [...new Set(detectedNumbers)];
  }

  // --- ২. নাম বের করা ---
  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // 'নাম:' দিয়ে শুরু হওয়া লাইনটি খোঁজা
  const nameLine = lines.find(
    (line) => line.toLowerCase().includes("নাম") && line.includes(":"),
  );

  if (nameLine) {
    data.castomerName = nameLine.split(":").pop().trim();
  } else if (lines.length > 0 && !lines[0].includes(data.castomerPhone[0])) {
    // যদি নির্দিষ্ট প্রিফিক্স না থাকে এবং প্রথম লাইনটি ফোন নম্বর না হয়, তবে প্রথম লাইনটিকে নাম হিসেবে নেওয়া
    data.castomerName = lines[0].trim().substring(0, 50); // ৫০ অক্ষরের মধ্যে সীমিত
  }

  return data;
}

module.exports = { parseOrderDetails };