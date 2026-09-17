"use client";
import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { orderService } from "@/services/orderService";
import DisplayTime from "@/components/common/DisplayTime";

const ORDER_STATUS_COLOR = {
  Pending: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  released: "bg-indigo-100 text-indigo-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Booked: "bg-amber-100 text-amber-700",
  Scheduled: "bg-purple-100 text-purple-700",
};

// --- Note বাবলের "আগের অর্ডার" বাটনে ক্লিক করলে খোলে — একই কাস্টমারের (ফোন নম্বর
// মিলিয়ে) আগের সব অর্ডারের সর্বশেষ স্ট্যাটাস দেখায় (শুধু দেখার জন্য, কোনো অ্যাকশন বাটন নেই)। ---
export default function PreviousOrderModal({ order, onClose }) {
  const [loading, setLoading] = useState(true);
  const [previousOrders, setPreviousOrders] = useState([]);

  useEffect(() => {
    if (!order?._id) return;
    setLoading(true);
    orderService
      .getPreviousOrders(order._id)
      .then((res) => setPreviousOrders(res.data?.previousOrders || []))
      .catch((err) => console.error("Previous orders fetch error:", err))
      .finally(() => setLoading(false));
  }, [order?._id]);

  if (!order) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-gray-800">
            আগের অর্ডার — {order.castomerName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl px-2"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="text-xs text-gray-400">লোড হচ্ছে...</p>
          ) : previousOrders.length === 0 ? (
            <p className="text-sm text-gray-500">
              এই কাস্টমারের কোনো আগের অর্ডার পাওয়া যায়নি।
            </p>
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-y-auto">
              {previousOrders.map((o) => (
                <div
                  key={o._id}
                  className="border border-gray-200 rounded-lg p-3 text-sm flex flex-col gap-1"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {o.castomerName}{" "}
                        <span className="text-gray-400 font-normal">
                          — {o.castomerPhone?.[0]}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {o.productCode} · ৳{o.totalCOD}
                      </p>
                    </div>
                    <DisplayTime timeStamp={o.activities[0]?.timestamp} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        ORDER_STATUS_COLOR[o.orderStatus] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      অর্ডার: {o.orderStatus}
                    </span>
                    {o.courier?.courierStatus &&
                      o.courier.courierStatus !== "unknown" && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          কুরিয়ার: {o.courier.courierStatus}
                        </span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}