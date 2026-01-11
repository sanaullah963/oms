/**
 * ইনপুট টেক্সট থেকে কাস্টমারের নাম, ফোন নম্বর এবং ঠিকানা পার্স করার ফাংশন।
 *
 * @param {string} rawText - কাস্টমার মেসেজ থেকে কপি করা মূল টেক্সট।
 * @returns {object} - পার্স করা ডেটা ধারণকারী একটি অবজেক্ট।
 */
function parseOrderDetails(rawText) {
  const data = {
    castomerName: "N/A",
    castomerPhone: "N/A",
    castomerAddress: "N/A",
    // totalCOD এবং productCode সরাসরি ফ্রন্ট-এন্ড থেকে বা অন্য লজিকে আসবে,
    // এই ফাংশন কেবল নাম, ফোন, ঠিকানা ফোকাস করছে।
  };

  // --- প্রস্তুতি: ডেটা পরিষ্কার করা ---
  // অতিরিক্ত whitespace, তারিখ/টাইমস্ট্যাম্প (যেমন [09/11, 5:19 pm]), ও অতিরিক্ত প্রিফিক্স সরিয়ে দিন
  let cleanedText = rawText
    .replace(/\[\d{2}\/\d{2}, \d{1,2}:\d{2} (am|pm)\] [a-zA-Z0-9\s]*?:/g, "") // WhatsApp ট্যাগ সরান
    .replace(/\n\s*\n/g, "\n") // একাধিক নতুন লাইন একটিতে পরিণত করা
    .trim();

  // --- ১. ফোন নম্বর বের করা (সবচেয়ে নির্ভরযোগ্য) ---

  // const PHONE_REGEX = /(?:\+?88)?\s*(01[0-9]{9}|০১[০-৯]{9})/;
  // const PHONE_REGEX = /(?:\+?88)?\s*((?:01|০১)(?:[\s.-]*[0-9০-৯]){9})/;
  const PHONE_REGEX = /(?:\+?88)?\s*((?:01|০১)(?:[\s.-]*[0-9০-৯]){9})/g;
  // const phoneMatch = cleanedText.match(PHONE_REGEX);
  const matches = [...cleanedText.matchAll(PHONE_REGEX)];
  let detectedNumbers = [];

  // if (phoneMatch) {
  //   data.castomerPhone = phoneMatch[1].trim();
  // }
  if (matches.length > 0) {
    detectedNumbers = matches.map((match) => {
      let num = match[1];
      // নম্বর নরমাল করা (স্পেস, হাইফেন সরানো এবং বাংলা থেকে ইংলিশে রূপান্তর)
      const benToEng = {
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
      let cleanNum = num
        .replace(/[\s.-]/g, "")
        .replace(/[০-৯]/g, (d) => benToEng[d]);
      return cleanNum;
    });
    // ইউনিক নম্বরগুলো রাখা (ডুপ্লিকেট এড়াতে)
    const uniqueNumbers = [...new Set(detectedNumbers)];
    data.castomerPhone = uniqueNumbers.join(", ");
  }

  // --- ২. নাম বের করা ---
  // নাম সাধারণত 'নাম:', 'Name:' বা টেক্সট ব্লকের প্রথম লাইনে থাকে।
  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // 'নাম:' দিয়ে শুরু হওয়া লাইনটি খোঁজা
  const nameLine = lines.find(
    (line) => line.toLowerCase().includes("নাম") && line.includes(":")
  );

  if (nameLine) {
    // colon এর পরের অংশটি নাম হিসেবে নেওয়া
    data.castomerName = nameLine.split(":").pop().trim();
  } else if (lines.length > 0 && !lines[0].includes(data.castomerPhone)) {
    // যদি নির্দিষ্ট প্রিফিক্স না থাকে এবং প্রথম লাইনটি ফোন নম্বর না হয়, তবে প্রথম লাইনটিকে নাম হিসেবে নেওয়া
    data.castomerName = lines[0].trim().substring(0, 50); // ৫০ অক্ষরের মধ্যে সীমিত
  }

  // --- ৩. ঠিকানা বের করা (নাম ও ফোন নম্বর বাদ দিয়ে) ---
  let addressBlock = cleanedText;

  // নাম, ফোন নম্বর এবং এদের প্রিফিক্সগুলো টেক্সট থেকে সরিয়ে দেওয়া
  addressBlock = addressBlock.replace(data.castomerPhone, "");
  addressBlock = addressBlock.replace(data.castomerame, "");
  addressBlock = addressBlock.replace(
    /নাম:?|মোবাইল নাম্বার:?|জেলা:?|থানা:?|এলাকা:?|গ্রাম:?|লোকেশন:?/giu,
    ""
  ); // ঠিকানা প্রিফিক্সগুলোও সরানো

  // একাধিক নতুন লাইন এবং অতিরিক্ত whitespace পরিষ্কার করা
  addressBlock = addressBlock.replace(/\s+/g, " ").trim();

  // যেহেতু ঠিকানা বের করা সবচেয়ে কঠিন, আমরা নাম ও ফোন নম্বর বাদ দিয়ে অবশিষ্ট অংশটিই ঠিকানা হিসেবে সেভ করব।
  data.castomerAddress = addressBlock;

  return data;
}

// এই ফাংশনটি যেন express.js এ ব্যবহার করা যায়
module.exports = { parseOrderDetails };
