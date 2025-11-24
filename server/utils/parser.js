

/**
 * ইনপুট টেক্সট থেকে কাস্টমারের নাম, ফোন নম্বর এবং ঠিকানা পার্স করার ফাংশন।
 *
 * @param {string} rawText - কাস্টমার মেসেজ থেকে কপি করা মূল টেক্সট।
 * @returns {object} - পার্স করা ডেটা ধারণকারী একটি অবজেক্ট।
 */
function parseOrderDetails(rawText) {
    const data = {
        castomerName: 'N/A',
        castomerPhone: 'N/A',
        castomerAddress: 'N/A',
        // totalCOD এবং productCode সরাসরি ফ্রন্ট-এন্ড থেকে বা অন্য লজিকে আসবে, 
        // এই ফাংশন কেবল নাম, ফোন, ঠিকানা ফোকাস করছে।
    };

    // --- প্রস্তুতি: ডেটা পরিষ্কার করা ---
    // অতিরিক্ত whitespace, তারিখ/টাইমস্ট্যাম্প (যেমন [09/11, 5:19 pm]), ও অতিরিক্ত প্রিফিক্স সরিয়ে দিন
    let cleanedText = rawText
        .replace(/\[\d{2}\/\d{2}, \d{1,2}:\d{2} (am|pm)\] [a-zA-Z0-9\s]*?:/g, '') // WhatsApp ট্যাগ সরান
        .replace(/\n\s*\n/g, '\n') // একাধিক নতুন লাইন একটিতে পরিণত করা
        .trim();

    // --- ১. ফোন নম্বর বের করা (সবচেয়ে নির্ভরযোগ্য) ---
    // Regex যা বাংলা (০-৯) এবং ইংরেজি (0-9) উভয় সংখ্যা সমর্থন করে।
    // এটি 'নাম্বার:', 'ফোন:', বা শুধু 01/০১৯... দিয়ে শুরু হওয়া ১১ সংখ্যার নম্বর খুঁজবে।
    const PHONE_REGEX = /(?:নাম্বার|মোবাইল|ফোন|ph|num)[\s\S]*?:?[\s\S]*?([০-৯]{10,11}|[0-9]{10,11})|(\s|^)((01|০১)[০-৯]{9})/iu;
    const phoneMatch = cleanedText.match(PHONE_REGEX);

    if (phoneMatch) {
        // phoneMatch[1] বা phoneMatch[3] এ নম্বরটি পাওয়া যায়
        const rawPhone = phoneMatch[1] || phoneMatch[3];
        if (rawPhone) {
             // শুধুমাত্র সংখ্যা সেভ হবে (কাস্টমার যে ফরম্যাটে দিয়েছে)
            data.castomerPhone = rawPhone.trim(); 
        }
    }
    
    // --- ২. নাম বের করা ---
    // নাম সাধারণত 'নাম:', 'Name:' বা টেক্সট ব্লকের প্রথম লাইনে থাকে।
    const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // 'নাম:' দিয়ে শুরু হওয়া লাইনটি খোঁজা
    const nameLine = lines.find(line => line.toLowerCase().includes('নাম') && line.includes(':'));
    
    if (nameLine) {
        // colon এর পরের অংশটি নাম হিসেবে নেওয়া
        data.castomerName = nameLine.split(':').pop().trim();
    } else if (lines.length > 0 && !lines[0].includes(data.castomerPhone)) {
        // যদি নির্দিষ্ট প্রিফিক্স না থাকে এবং প্রথম লাইনটি ফোন নম্বর না হয়, তবে প্রথম লাইনটিকে নাম হিসেবে নেওয়া
        data.castomerName = lines[0].trim().substring(0, 50); // ৫০ অক্ষরের মধ্যে সীমিত
    }
    
    // --- ৩. ঠিকানা বের করা (নাম ও ফোন নম্বর বাদ দিয়ে) ---
    let addressBlock = cleanedText;

    // নাম, ফোন নম্বর এবং এদের প্রিফিক্সগুলো টেক্সট থেকে সরিয়ে দেওয়া
    addressBlock = addressBlock.replace(data.castomerPhone, '');
    addressBlock = addressBlock.replace(data.castomerame, '');
    addressBlock = addressBlock.replace(/নাম:?|মোবাইল নাম্বার:?|জেলা:?|থানা:?|এলাকা:?|গ্রাম:?|লোকেশন:?/igu, ''); // ঠিকানা প্রিফিক্সগুলোও সরানো

    // একাধিক নতুন লাইন এবং অতিরিক্ত whitespace পরিষ্কার করা
    addressBlock = addressBlock.replace(/\s+/g, ' ').trim(); 

    // যেহেতু ঠিকানা বের করা সবচেয়ে কঠিন, আমরা নাম ও ফোন নম্বর বাদ দিয়ে অবশিষ্ট অংশটিই ঠিকানা হিসেবে সেভ করব।
    data.castomerAddress = addressBlock;


    return data;
}

// এই ফাংশনটি যেন express.js এ ব্যবহার করা যায়
module.exports = { parseOrderDetails };