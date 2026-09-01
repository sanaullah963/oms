"use client";
import React, { useState } from "react";
import { formatDate, formatTime } from "@/utils/dateUtils";

// প্রথমে সর্বশেষ কয়টা অ্যাক্টিভিটি দেখাবে (বাকিগুলো "আরও দেখুন" চাপলে খুলবে)
const INITIAL_VISIBLE_COUNT = 3;

function ActivityRow({ activity }) {
  return (
    <div className="flex items-start text-xs">
      <div className="w-1/4 flex flex-col">
        <span className="font-bold text-gray-500">{formatDate(activity?.timestamp)}</span>
        <span className="font-bold">{formatTime(activity?.timestamp)}</span>
      </div>
      <div className="w-3/4 pl-3 border-l-2 border-dashed border-gray-200">
        <p className="font-semibold text-gray-800">
          <span className="text-purple-600"> {activity?.actor || activity?.author}</span>{" "}
          - {activity?.type}
        </p>
        <p className="text-gray-600 mt-0.5">
          {activity?.details?.description ||
            activity?.description ||
            activity?.note ||
            "নোট নেই"}
        </p>
      </div>
    </div>
  );
}

// --- একটা অর্ডারের অ্যাক্টিভিটি টাইমলাইন, ডিফল্টভাবে সর্বশেষ কয়েকটা দেখায়, বাকিগুলো
// "আরও দেখুন" চাপলে এক্সপান্ড হয় (OrderActivityTimeline-এর মতোই ডিজাইন, শুধু
// প্রাথমিকভাবে সব দেখানোর বদলে সংক্ষিপ্ত/এক্সপান্ডযোগ্য) ---
function TrackingActivityTimeline({ activities, initialVisibleCount = INITIAL_VISIBLE_COUNT }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedActivities = [...(activities || [])].sort(
    (a, b) => new Date(b?.timestamp) - new Date(a?.timestamp),
  );

  if (sortedActivities.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic mt-2 pt-2 border-t border-gray-100">
        এই অর্ডারের জন্য কোনো অ্যাক্টিভিটি রেকর্ড করা হয়নি।
      </p>
    );
  }

  const visibleActivities = isExpanded
    ? sortedActivities
    : sortedActivities.slice(0, initialVisibleCount);
  const remainingCount = sortedActivities.length - initialVisibleCount;

  return (
    <div className="space-y-3 mt-2 pt-2 border-t border-gray-100">
      {visibleActivities.map((activity, index) => (
        <ActivityRow key={index} activity={activity} />
      ))}

      {remainingCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
        >
          {isExpanded ? "▲ কম দেখুন" : `▼ আরও ${remainingCount}টি অ্যাক্টিভিটি দেখুন`}
        </button>
      )}
    </div>
  );
}

export default TrackingActivityTimeline;
