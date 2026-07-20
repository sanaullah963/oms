/**
 * কুরিয়ারের ১% COD চার্জ হিসাব করে।
 * নিয়ম: (ডেলিভারড COD amount - ডেলিভারি চার্জ) এর ১%, উপরে রাউন্ড করা (ceil)।
 * উদাহরণ: cod=1500, deliveryCharge=100 -> base=1400 -> charge = ceil(14) = 14 টাকা
 *
 * @param {number} deliveredCodAmount
 * @param {number} deliveryCharge
 * @returns {number}
 */
function calculateCodCharge(deliveredCodAmount, deliveryCharge) {
  const base = Number(deliveredCodAmount || 0) - Number(deliveryCharge || 0);
  if (base <= 0) return 0;
  return Math.ceil(base * 0.01);
}

module.exports = { calculateCodCharge };
