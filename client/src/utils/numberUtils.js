const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const ENGLISH_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// --- বাংলা সংখ্যাকে ইংরেজি সংখ্যায় রূপান্তর করে ---
export const convertNumber = (input) => {
  try {
    if (!input) return input;
    let output = input;
    for (let i = 0; i < BANGLA_DIGITS.length; i++) {
      output = output.replace(new RegExp(BANGLA_DIGITS[i], "g"), ENGLISH_DIGITS[i]);
    }
    return output;
  } catch (error) {
    console.log("error", error);
  }
};
