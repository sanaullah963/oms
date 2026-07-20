import React from "react";
import { formatDate, formatTime } from "@/utils/dateUtils";

function OrderActivityTimeline({ activities }) {
  const sortedActivities = [...(activities || [])].sort(
    (a, b) => new Date(b?.timestamp) - new Date(a?.timestamp),
  );

  if (sortedActivities.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic">
        এই অর্ডারের জন্য কোনো অ্যাক্টিভিটি রেকর্ড করা হয়নি।
      </p>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto mt-1 pt-2">
      {sortedActivities.map((activity, index) => (
        <div key={index} className="flex items-start text-xs">
          <div className="w-1/4 flex flex-col">
            <span className="font-bold text-gray-500">{formatDate(activity.timestamp)}</span>
            <span className="font-bold">{formatTime(activity.timestamp)}</span>
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
      ))}
    </div>
  );
}

export default OrderActivityTimeline;
