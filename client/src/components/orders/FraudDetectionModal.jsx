"use client";
import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import { orderService } from "@/services/orderService";
import DisplayTime from "@/components/common/DisplayTime";

const RULE_ICON = {
  phone: "📞",
  fingerprint: "🖥️",
  ip: "🌐",
  facebook: "📘",
};

const ORDER_STATUS_COLOR = {
  Pending: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  released: "bg-indigo-100 text-indigo-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Booked: "bg-amber-100 text-amber-700",
  Scheduled: "bg-purple-100 text-purple-700",
};

/**
 * ===================== তিনটা অ্যাকশন বাটন — কোনটা কী করে =====================
 *
 * Approve  → PATCH /api/orders/:id/fraud-review { action: "approve" }
 *            "এটা প্রকৃতপক্ষে জাল/ডুপ্লিকেট না, স্বাভাবিক অর্ডার" — শুধু এই অর্ডারের
 *            fraudCheck.reviewStatus = "approved" হয়ে যায়, Badge আর দেখাবে না।
 *            কাস্টমার ব্লক হয় না, অন্য কোনো অর্ডারে প্রভাব পড়ে না।
 *
 * Ignore   → PATCH /api/orders/:id/fraud-review { action: "ignore" }
 *            "এখন সিদ্ধান্ত নিচ্ছি না, পরে দেখব" — reviewStatus = "ignored" হয়,
 *            Badge ধূসর হয়ে যায় (এখনো ক্লিক করা যায়, আবার রিভিউ করা যায়)।
 *            কাস্টমার ব্লক হয় না।
 *
 * Block Customer → PATCH /api/orders/:id/fraud-review { action: "block" }
 *            "এই কাস্টমারকে ব্লক করো" — reviewStatus = "blocked" হয়, এবং সার্ভারে
 *            নতুন BlockedCustomer রেকর্ড তৈরি হয় (এই অর্ডারের phone/fingerprintHash/
 *            ip/fbp/fbc/fbclid দিয়ে)। এরপর এই কাস্টমার আবার ল্যান্ডিং পেজে অর্ডার
 *            করার চেষ্টা করলে সার্ভার অর্ডার তৈরিই করবে না, শুধু WhatsApp Popup
 *            দেখাবে। /dashboard/blocked-customers পেজ থেকে পরে আনব্লকও করা যায়।
 * ================================================================================
 */

export default function FraudDetectionModal({ order, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [matchLoading, setMatchLoading] = useState(true);
  const [matchedOrders, setMatchedOrders] = useState([]);
  const [reasons, setReasons] = useState(order?.fraudCheck?.reasons || []);

  useEffect(() => {
    if (!order?._id) return;
    setMatchLoading(true);
    orderService
      .getFraudMatches(order._id)
      .then((res) => {
        setMatchedOrders(res.data?.matchedOrders || []);
        if (res.data?.reasons) setReasons(res.data.reasons);
      })
      .catch((err) => console.error("Fraud matches fetch error:", err))
      .finally(() => setMatchLoading(false));
  }, [order?._id]);

  if (!order) return null;

  const fraudCheck = order.fraudCheck || {};

  // কোন rule কোন matched order-এর সাথে মিলেছে তা লুকআপ করার জন্য
  const ruleByOrderId = {};
  reasons.forEach((r) => {
    (r.matchedOrderIds || []).forEach((id) => {
      const key = String(id);
      ruleByOrderId[key] = ruleByOrderId[key] || [];
      ruleByOrderId[key].push(r.rule);
    });
  });

  const runAction = async (action) => {
    setLoading(true);
    try {
      const reason = action === "block" ? blockReason : undefined;
      const res = await orderService.reviewFraud(order._id, action, reason);
      if (res.data?.order && onUpdate) onUpdate(res.data.order);
      toast.success(
        action === "approve"
          ? "অর্ডারটি স্বাভাবিক হিসেবে অনুমোদন করা হলো।"
          : action === "ignore"
            ? "ডিটেকশন উপেক্ষা করা হলো।"
            : "কাস্টমারকে ব্লক করা হলো।",
      );
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "ব্যর্থ হয়েছে, আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-red-600">⚠️ Multiple Orders Detected</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl px-2">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              <b>{order.castomerName}</b> — {order.castomerPhone?.[0]}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              বর্তমান রিভিউ স্ট্যাটাস:{" "}
              <span className="font-semibold">{fraudCheck.reviewStatus || "none"}</span>
              {fraudCheck.reviewedByName ? ` (${fraudCheck.reviewedByName})` : ""}
            </p>
          </div>

          {/* কারণসমূহ */}
          <div className="space-y-2">
            {reasons.length === 0 && (
              <p className="text-sm text-gray-500">কোনো ম্যাচ পাওয়া যায়নি।</p>
            )}
            {reasons.map((r) => (
              <div
                key={r.rule}
                className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm"
              >
                <span>{RULE_ICON[r.rule] || "✅"}</span>
                <span className="font-semibold text-red-700">{r.label}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {(r.matchedOrderIds || []).length} আগের অর্ডারে
                </span>
              </div>
            ))}
          </div>

          {/* ম্যাচ হওয়া আগের অর্ডারের পূর্ণ বিবরণ — ডেলিভারি/কুরিয়ার স্ট্যাটাসসহ */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              ম্যাচ হওয়া আগের অর্ডার
              {matchedOrders.length > 0 ? ` (${matchedOrders.length}টি)` : ""}
            </p>

            {matchLoading ? (
              <p className="text-xs text-gray-400">লোড হচ্ছে...</p>
            ) : matchedOrders.length === 0 ? (
              <p className="text-xs text-gray-400">কোনো বিস্তারিত তথ্য পাওয়া যায়নি।</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {matchedOrders.map((m) => (
                  <div
                    key={m._id}
                    className="border border-gray-200 rounded-lg p-3 text-sm flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {m.castomerName}{" "}
                          <span className="text-gray-400 font-normal">
                            — {m.castomerPhone?.[0]}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {m.productCode} · ৳{m.totalCOD} · {m.orderSource || "Manual"}
                        </p>
                      </div>
                      <DisplayTime timeStamp={m.createdAt} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          ORDER_STATUS_COLOR[m.orderStatus] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        অর্ডার: {m.orderStatus}
                      </span>
                      {m.courier?.courierStatus && m.courier.courierStatus !== "Unknown" && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          কুরিয়ার: {m.courier.courierStatus}
                        </span>
                      )}
                      {(ruleByOrderId[String(m._id)] || []).map((rule) => (
                        <span
                          key={rule}
                          className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200"
                        >
                          {RULE_ICON[rule]} {rule}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ব্লক করার আগে কারণ লেখা (optional) */}
          {showBlockConfirm && (
            <div className="border border-red-300 rounded-lg p-3 bg-red-50">
              <p className="text-sm font-semibold text-red-700 mb-2">
                নিশ্চিত করুন — এই কাস্টমারকে ব্লক করলে ভবিষ্যতে ল্যান্ডিং পেজে অর্ডার
                সাবমিট করলে একটা Popup দেখাবে (WhatsApp-এ যোগাযোগ করতে বলা হবে), অর্ডার
                আর তৈরি হবে না।
              </p>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="ব্লক করার কারণ (ঐচ্ছিক)"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 mb-2"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowBlockConfirm(false)}
                  className="px-3 py-1.5 text-sm rounded-md bg-gray-200 text-gray-700"
                >
                  বাতিল
                </button>
                <button
                  disabled={loading}
                  onClick={() => runAction("block")}
                  className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white font-semibold disabled:opacity-50"
                >
                  হ্যাঁ, ব্লক করুন
                </button>
              </div>
            </div>
          )}
        </div>

        {!showBlockConfirm && (
          <div className="p-5 border-t border-gray-200 flex flex-wrap gap-2 justify-end sticky bottom-0 bg-white">
            <button
              disabled={loading}
              onClick={() => runAction("ignore")}
              className="px-4 py-2 text-sm rounded-lg bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
              title="এখন সিদ্ধান্ত নিচ্ছি না — reviewStatus হবে 'ignored', কাউকে ব্লক করা হবে না"
            >
              Ignore
            </button>
            <button
              disabled={loading}
              onClick={() => runAction("approve")}
              className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50"
              title="এটা স্বাভাবিক অর্ডার — reviewStatus হবে 'approved', Badge চলে যাবে"
            >
              Approve
            </button>
            <button
              disabled={loading}
              onClick={() => setShowBlockConfirm(true)}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50"
              title="কাস্টমারকে BlockedCustomer লিস্টে যোগ করবে — ভবিষ্যতে ল্যান্ডিং পেজে অর্ডার আটকে যাবে"
            >
              Block Customer
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
