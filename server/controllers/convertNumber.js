 function convertNumber(input) {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  let output = input;
  for (let i = 0; i < banglaDigits.length; i++) {
    output = output.replace(new RegExp(banglaDigits[i], "g"), englishDigits[i]);
  }
  return output;
}
module.exports = convertNumber;