import { formatTimeAgo } from "@/utils/dateUtils";
import React from "react";

function DisplayAgoTime({ timeStamp }) {
  return (
    <div>
          <span className="text-gray-500 italic text-sm flex gap-1.5 md:gap-3 ">
            <span className="whitespace-nowrap">{`${formatTimeAgo(timeStamp)}`}</span>
          </span>
        </div>
  )
}

export default DisplayAgoTime