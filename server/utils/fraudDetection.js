const Order = require("../models/Order");
const BlockedCustomer = require("../models/BlockedCustomer");

/**
 * নতুন কাস্টমারের সিগন্যাল (phone/fingerprintHash/ip/fbp/fbc/fbclid) আগের কোনো
 * Order-এর সাথে মেলে কিনা খুঁজে বের করে। কখনো কাউকে ব্লক করে না — শুধু ম্যাচ +
 * কারণ রিটার্ন করে, বাকি সিদ্ধান্ত অ্যাডমিনের (Badge/Modal-এ দেখানো হবে)।
 *
 * @param {{phone?: string, fingerprintHash?: string, ip?: string, fbp?: string, fbc?: string, fbclid?: string, excludeOrderId?: string}} signals
 * @returns {Promise<{isSuspicious: boolean, reasons: Array, matchedOrders: Array}>}
 */
async function checkFraudSignals(signals = {}) {
  const { phone, fingerprintHash, ip, fbp, fbc, fbclid, excludeOrderId } = signals;

  const rules = [
    { rule: "phone", label: "Same Phone", query: phone ? { castomerPhone: phone } : null },
    {
      rule: "fingerprint",
      label: "Same Browser Fingerprint",
      query: fingerprintHash ? { "tracking.fingerprintHash": fingerprintHash } : null,
    },
    { rule: "ip", label: "Same IP Address", query: ip ? { "tracking.ip": ip } : null },
    {
      rule: "facebook",
      label: "Same Facebook Tracking (fbp/fbc/fbclid)",
      query:
        fbp || fbc || fbclid
          ? {
              $or: [
                ...(fbp ? [{ "tracking.fbp": fbp }] : []),
                ...(fbc ? [{ "tracking.fbc": fbc }] : []),
                ...(fbclid ? [{ "tracking.fbclid": fbclid }] : []),
              ],
            }
          : null,
    },
  ];

  const reasons = [];
  const matchedOrdersMap = new Map(); // orderId -> order doc (dedup, একই অর্ডার একাধিক রুলে ম্যাচ করতে পারে)

  for (const { rule, label, query } of rules) {
    if (!query) continue;
    const finalQuery = excludeOrderId ? { ...query, _id: { $ne: excludeOrderId } } : query;
    const matches = await Order.find(finalQuery)
      .select("castomerName castomerPhone totalCOD orderStatus productCode createdAt tracking")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (matches.length > 0) {
      reasons.push({
        rule,
        label,
        matchedOrderIds: matches.map((m) => m._id),
      });
      matches.forEach((m) => matchedOrdersMap.set(String(m._id), m));
    }
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    matchedOrders: Array.from(matchedOrdersMap.values()),
  };
}

/**
 * অ্যাডমিন-ব্লক করা কাস্টমারের সাথে মিলে কিনা চেক করে (phone/fingerprint/ip/fbp/fbc/fbclid —
 * যেকোনো একটা ম্যাচ করলেই ব্লক ধরা হয়)। এটা publicLandingController.submitPublicOrder-এ
 * অর্ডার নেওয়ার আগে কল হয় — ব্লক হলে অর্ডার তৈরিই হয় না, ল্যান্ডিং পেজে Popup দেখানো হয়।
 *
 * @param {{phone?: string, fingerprintHash?: string, ip?: string, fbp?: string, fbc?: string, fbclid?: string}} signals
 * @returns {Promise<object|null>} ম্যাচ হওয়া BlockedCustomer রেকর্ড, না হলে null
 */
async function checkBlocked(signals = {}) {
  const { phone, fingerprintHash, ip, fbp, fbc, fbclid } = signals;

  const orConditions = [
    ...(phone ? [{ phone }] : []),
    ...(fingerprintHash ? [{ fingerprintHash }] : []),
    ...(ip ? [{ ip }] : []),
    ...(fbp ? [{ fbp }] : []),
    ...(fbc ? [{ fbc }] : []),
    ...(fbclid ? [{ fbclid }] : []),
  ];

  if (orConditions.length === 0) return null;

  const blocked = await BlockedCustomer.findOne({
    isActive: true,
    $or: orConditions,
  }).lean();

  return blocked || null;
}

module.exports = { checkFraudSignals, checkBlocked };
