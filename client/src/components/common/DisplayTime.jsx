import { formatDate, formatTime } from "@/utils/dateUtils";
import React from "react";

function DisplayTime({ timeStamp }) {
  return (
    <div>
      <span className="text-gray-700 text-sm flex gap-1.5 md:gap-3 ">
        <span className="whitespace-nowrap">{`${formatTime(timeStamp)}`}</span>
        <span className="whitespace-nowrap">{`${formatDate(timeStamp)}`}</span>
      </span>
    </div>
  );
}

export default DisplayTime;
