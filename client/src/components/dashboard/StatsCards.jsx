// const CARD_CONFIG = [
//   { key: "sentCount", label: "মোট পাঠানো পার্সেল", color: "bg-blue-50 text-blue-700", icon: "📦" },
//   { key: "deliveredCount", label: "ডেলিভারড", color: "bg-green-50 text-green-700", icon: "✅" },
//   { key: "cancelledCount", label: "ক্যান্সেলড", color: "bg-red-50 text-red-700", icon: "❌" },
//   {
//     key: "sentAmount",
//     label: "মোট COD এমাউন্ট (পাঠানো)",
//     color: "bg-purple-50 text-purple-700",
//     icon: "৳",
//     isAmount: true,
//   },
// ];

// export default function StatsCards({ totals }) {
//   return (
//     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//       {CARD_CONFIG.map((c) => (
//         <div key={c.key} className={`rounded-xl p-4 shadow-sm ${c.color}`}>
//           <div className="text-2xl mb-1">{c.icon}</div>
//           <div className="text-xl font-bold">
//             {c.isAmount ? `৳${(totals[c.key] || 0).toLocaleString("bn-BD")}` : (totals[c.key] || 0).toLocaleString("bn-BD")}
//           </div>
//           <div className="text-xs font-medium mt-1">{c.label}</div>
//         </div>
//       ))}
//     </div>
//   );
// }

export default function StatsCards({ totals, onCardClick }) {
  const netAfterDeliveryCharge =
    (totals.deliveredAmount || 0) - (totals.deliveredDeliveryCharge || 0);


    console.log("totals", totals);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {/* --- মোট পাঠানো পার্সেল --- */}
      <button
        onClick={() => onCardClick?.("sent")}
        className="text-left rounded-xl p-4 shadow-sm bg-blue-100 text-blue-700 hover:shadow-md transition cursor-pointer"
      >
        <div className="text-2xl mb-1">📦</div>
        <div className="text-xl font-bold">
          {(totals.sentCount || 0).toLocaleString("bn-BD")}
        </div>
        <div className="text-xs font-medium mt-1">মোট পাঠানো পার্সেল</div>
      </button>

      {/* --- ডেলিভারড (৩টা এমাউন্ট সহ) --- */}
      <button
        onClick={() => onCardClick?.("delivered")}
        className="text-left rounded-xl p-4 shadow-sm bg-green-100 text-green-700 hover:shadow-md transition cursor-pointer"
      >
        <span className="flex items-center justify-center gap-2">
          {/* <div className="text-2xl mb-1">✅</div> */}
          <div className="text-2xl font-bold">
            {(totals.deliveredCount || 0).toLocaleString("bn-BD")}
          </div>
          <div className="text-xs font-medium mt-1 mb-2">ডেলিভারি হয়েছে</div>
        </span>

        <div className="text-[14px] space-y-0.5 border-t border-green-200 pt-1.5">
          <div className="flex justify-between">
            <span>ডেলিভারি এমাউন্ট</span>
            <span className="font-semibold">
              ৳{(totals.deliveredAmount || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between border-b ">
            <span>ডেলিভারি চার্জ</span>
            <span className="font-semibold">
              ৳{(totals.deliveredDeliveryCharge || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>চার্জ বাদে</span>
            <span className="font-semibold">
              ৳{netAfterDeliveryCharge.toLocaleString("bn-BD")}
            </span>
          </div>
        </div>
      </button>

      {/* --- ক্যান্সেলড (ক্যান্সেল চার্জ সহ) --- */}
      <button
        onClick={() => onCardClick?.("cancelled")}
        className="text-left rounded-xl p-4 shadow-sm bg-red-100 text-red-700 hover:shadow-md transition cursor-pointer"
      >
        <div className="text-2xl mb-1">❌</div>
        <div className="text-xl font-bold">
          {(totals.cancelledCount || 0).toLocaleString("bn-BD")}
        </div>
        <div className="text-xs font-medium mt-1 mb-2">ক্যান্সেলড</div>
        <div className="text-[14px] border-t border-red-200 pt-1.5 flex justify-between">
          <span>ক্যান্সেল চার্জ</span>
          <span className="font-semibold">
            ৳{(totals.cancelledDeliveryCharge || 0).toLocaleString("bn-BD")}
          </span>
        </div>
      </button>

{/* --- ক্যান্সেলড (ক্যান্সেল চার্জ সহ) --- */}  
      <div
        // onClick={() => onCardClick?.("delivered")}
        className="text-left rounded-xl p-4 shadow-sm bg-red-100 text-red-700 hover:shadow-md transition cursor-pointer"
      >
        <span className="flex items-center justify-between">
          <div className="text-xl font-bold">মোট খরচ </div>
          {/* <div className="text-xs font-medium mt-1 mb-2">Delivered</div> */}
        </span>

        <div className="text-[14px] space-y-0.5 border-t border-green-200 pt-1.5">
          <div className="flex justify-between">
            <span>ক্যান্সেল চার্জ</span>
            <span className="font-semibold">
              ৳{(totals.cancelledDeliveryCharge || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>COD চার্জ</span>
            <span className="font-semibold">
              ৳{(totals.totalCodCharge || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between border-b ">
            <span>ডেলিভারি চার্জ</span>
            <span className="font-semibold">
              ৳{(totals.deliveredDeliveryCharge || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>মূল ব্যালেন্স থেকে মোট কর্তন</span>
            {/* <span className="font-semibold">৳{netAfterDeliveryCharge.toLocaleString("bn-BD")}</span> */}
            <span className="font-semibold">
              ৳{(totals.netDeduction || 0).toLocaleString("bn-BD")}
            </span>
          </div>
        </div>
      </div>



         {/* --- মোট টাকা --- */}
      <div
        // onClick={() => onCardClick?.("delivered")}
        className="text-left rounded-xl p-4 shadow-sm bg-red-100 text-red-700 hover:shadow-md transition cursor-pointer"
      >
        <span className="flex items-center justify-between">
          {/* <div className="text-2xl mb-1">✅</div> */}
          <div className="text-xl font-bold">মোট টাকা আছে</div>
          {/* <div className="text-xs font-medium mt-1 mb-2">Delivered</div> */}
        </span>

        <div className="text-[14px] space-y-0.5 border-t border-green-200 pt-1.5">
          <div className="flex justify-between">
            <span>ডেলিভারি এমাউন্ট</span>
            <span className="font-semibold">
              ৳{(totals.deliveredAmount || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between  border-b ">
            <span>মোট খরচ</span>
            <span className="font-semibold">
               ৳{(totals.netDeduction || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>মূল ব্যালেন্স</span>
            {/* <span className="font-semibold">৳{netAfterDeliveryCharge.toLocaleString("bn-BD")}</span> */}
            <span className="font-semibold">
              {(totals.mainBalanceAfterCosting || 0).toLocaleString("bn-BD")}
            </span>
          </div>
        </div>
      </div>





      {/* --- মোট COD এমাউন্ট (পাঠানো) --- */}
      <div className="rounded-xl p-4 shadow-sm bg-purple-50 text-purple-700">
        <div className="text-2xl mb-1">৳</div>
        <div className="text-xl font-bold">
          ৳{(totals.sentAmount || 0).toLocaleString("bn-BD")}
        </div>
        <div className="text-xs font-medium mt-1">মোট COD এমাউন্ট (পাঠানো)</div>
      </div>
    </div>
  );
}
