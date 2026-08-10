"use client";
import React, { useState } from "react";
import DisplayTime from "@/components/common/DisplayTime";
import ConfirmModal from "@/components/common/ConfirmModal";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { useOrders } from "@/context/OrderContext";

// --- একটা ইনকমপ্লিট/ড্রাফট অর্ডার — কাস্টমার ল্যান্ডিং পেজের ফর্ম পূরণ করেছে কিন্তু
// এখনো "অর্ডার করুন" বাটনে ক্লিক করেনি। এটা আসল Order না, তাই এখানে স্ট্যাটাস বদলানো,
// কুরিয়ার বুকিং ইত্যাদি কোনো অ্যাকশন নেই — শুধু দেখা এবং প্রয়োজনে কল করা/ডিলিট করা যায়।
// কাস্টমার সাবমিট করলেই এটা স্বয়ংক্রিয়ভাবে এই লিস্ট থেকে সরে গিয়ে আসল অর্ডার লিস্টে চলে আসবে।
export default function DraftOrderCard({ draft }) {
  const { deleteDraftOrder, setSearchQuery } = useOrders();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const phone = draft?.phone || "";

  const handleCopyPhone = () => {
    if (phone) copyToClipboard(phone);
  };

  const handleSearchThisNumber = () => {
    if (phone) setSearchQuery(phone);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    await deleteDraftOrder(draft._id);
    setIsDeleting(false);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-3 border-l-4 border-amber-400">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
              ইনকমপ্লিট
            </span>
            {draft?.productName && (
              <span className="text-xs text-gray-500 truncate">{draft.productName}</span>
            )}
          </div>

          <p className="mt-1 font-semibold text-gray-800">
            {draft?.name || <span className="text-gray-400">নাম দেওয়া হয়নি</span>}
          </p>

          <button
            onClick={handleSearchThisNumber}
            className="text-sm text-blue-600 underline decoration-dotted"
            disabled={!phone}
          >
            {phone || "ফোন নম্বর দেওয়া হয়নি"}
          </button>

          <p className="text-sm text-gray-600 mt-1">
            {draft?.address || <span className="text-gray-400">ঠিকানা দেওয়া হয়নি</span>}
          </p>

          {draft?.quantity > 1 && (
            <p className="text-sm text-gray-500 mt-0.5">পরিমাণ: {draft.quantity}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <DisplayTime timeStamp={draft?.lastActivityAt || draft?.updatedAt} />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {phone && (
          <>
            <a
              href={`tel:${phone}`}
              className="flex-1 text-center text-sm font-medium bg-green-600 text-white rounded-md py-1.5"
            >
              📞 কল করুন
            </a>
            <button
              onClick={handleCopyPhone}
              className="flex-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-md py-1.5"
            >
              নম্বর কপি
            </button>
          </>
        )}
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-sm font-medium bg-red-50 text-red-600 rounded-md py-1.5 px-3"
        >
          🗑️ ডিলিট করুন
        </button>
      </div>

      <ConfirmModal
        isVisible={isModalOpen}
        type="confirm"
        message="এই ইনকমপ্লিট অর্ডারটা স্থায়ীভাবে ডিলিট হয়ে যাবে। কাস্টমার আবার ফর্ম পূরণ শুরু করলে নতুন করে দেখা যাবে। নিশ্চিত?"
        onConfirm={handleConfirmDelete}
        onCancel={() => !isDeleting && setIsModalOpen(false)}
      />
    </div>
  );
}