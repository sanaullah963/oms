export default function StatsCards({ totals, onCardClick }) {
  const netAfterDeliveryCharge =
    (totals.deliveredAmount || 0) -
    ((totals.deliveredDeliveryCharge || 0) + (totals.totalCodCharge || 0));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
      {/* --- মোট পাঠানো পার্সেল --- */}
      <button
        onClick={() => onCardClick?.("sent")}
        className=" rounded-xl p-1 shadow-sm bg-blue-100 text-green-700 hover:shadow-md transition cursor-pointer flex justify-center items-center flex-col "
      >
        {/* show total parcel count */}
        <div className="flex gap-2 items-center">
          <div className="text-xs font-medium mt-1">পাঠিয়েছি</div>
          <div className="text-xl font-bold text-green-900">
            {(totals.sentCount || 0).toLocaleString("bn-BD")}
          </div>
          {/* <div className="text-xs font-medium mt-1">
            {" "}
            টি
          </div> */}
        </div>
        {/* show total parcel cod amount */}
        <div className="flex gap-2 items-center">
          <div className="text-xs font-medium">মোট COD </div>
          <div className="text-md md:text-xl font-bold">
            {(totals.sentAmount || 0).toLocaleString("bn-BD")}
          </div>
          {/* <div className="text-xs font-medium mt-1">
            {" "}
            টাকা
          </div> */}
        </div>
      </button>

      {/* --- পেন্ডিং পার্সেল (বুক হয়েছে, এখনো ডেলিভারড/ক্যান্সেলড হয়নি) --- */}
      <button
        onClick={() => onCardClick?.("pending")}
        className="text-left rounded-xl p-1 shadow-sm bg-amber-100 text-amber-700 hover:shadow-md transition cursor-pointer flex justify-center items-center flex-col"
      >
        <div className="flex gap-2 items-center">
          <div className="text-xs font-medium">পেন্ডিং পার্সেল</div>
          <div className="text-xl font-bold text-amber-900">
            {(totals.pendingCount || 0).toLocaleString("bn-BD")}
          </div>
        </div>
        <div className="text-xs font-medium mt-1"></div>
        <div className="text-sm font-semibold mt-1">
          ৳{(totals.pendingAmount || 0).toLocaleString("bn-BD")}
        </div>
      </button>

      {/* --- ডেলিভারড (৩টা এমাউন্ট সহ) --- */}
      <button
        onClick={() => onCardClick?.("delivered")}
        className="text-left rounded-xl p-1 shadow-sm bg-green-100 text-green-700 hover:shadow-md transition cursor-pointer"
      >
        <span className="flex items-center justify-center gap-2">
          <div className="text-xs font-medium mt-1 mb-2">Delivered</div>
          <div className="text-2xl font-bold">
            {(totals.deliveredCount || 0).toLocaleString("bn-BD")}
          </div>
        </span>

        <div className="text-[11px] space-y-0.5 border-t border-green-200 pt-1.5">
          <div className="flex justify-between">
            <span>মোট টাকা</span>
            <span className="font-semibold">
              ৳{(totals.deliveredAmount || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>ডেলিভারি চার্জ</span>
            <span className="font-semibold">
              ৳{(totals.deliveredDeliveryCharge || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between border-b text-red-500">
            <span>COD চার্জ</span>
            <span className="font-semibold">
              ৳{(totals.totalCodCharge || 0).toLocaleString("bn-BD")}
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
        className="text-left rounded-xl p-1 shadow-sm bg-red-100 text-red-700 hover:shadow-md transition cursor-pointer"
      >
        <div className="flex items-center justify-center gap-2">
          <div className="text-xs font-medium">ক্যান্সেল</div>
          <div className="text-xl font-bold">
            {(totals.cancelledCount || 0).toLocaleString("bn-BD")}
          </div>
        </div>

        {/* <div className="text-xs font-medium mt-1 mb-2">ক্যান্সেলড</div> */}
        <div className="text-[11px] border-t border-red-200 pt-1.5 flex justify-between">
          <span>ক্যান্সেল চার্জ</span>
          <span className="font-semibold">
            ৳{(totals.cancelledDeliveryCharge || 0).toLocaleString("bn-BD")}
          </span>
        </div>
      </button>

      {/* --- ক্যান্সেলড (ক্যান্সেল চার্জ সহ) --- */}
      <div
        // onClick={() => onCardClick?.("delivered")}
        className="text-left rounded-xl p-1 shadow-sm bg-red-100 text-red-700 hover:shadow-md transition cursor-pointer"
      >
        <span className="flex items-center justify-between">
          <div className="text-xl font-bold">মোট আছে </div>
          {/* <div className="text-xs font-medium mt-1 mb-2">Delivered</div> */}
        </span>

        <div className="text-[11px] space-y-0.5 border-t  border-red-200 pt-1.5">
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
            <span>মোট খরচ</span>
            {/* <span className="font-semibold">৳{netAfterDeliveryCharge.toLocaleString("bn-BD")}</span> */}
            <span className="font-semibold">
              ৳{(totals.netDeduction || 0).toLocaleString("bn-BD")}
            </span>
          </div>

            <div className="flex justify-between text-green-800 border-b">
            <span>ডেলিভারি টাকা</span>
            <span className="font-semibold">
              ৳{(totals.deliveredAmount || 0).toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex justify-between text-green-800">
            <span>মূল ব্যালেন্স</span>
            {/* <span className="font-semibold">৳{netAfterDeliveryCharge.toLocaleString("bn-BD")}</span> */}
            <span className="font-semibold">
              {(totals.mainBalanceAfterCosting || 0).toLocaleString("bn-BD")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
