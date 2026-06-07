import { formatDate, formatTime } from "@/constants/data";
import React from "react";

function DisplayTime({timeStamp}) {
  return (
    <div>
      <span className="text-gray-700 text-sm flex gap-1.5 md:gap-3 ">
        {/* <span className="text-indigo-700 hidden md:inline">Created</span> */}
        
        <span>{`${formatTime(timeStamp)}`}</span>
        <span>{`${formatDate(timeStamp)}`}</span>
      </span>
    </div>
  );
}

export default DisplayTime;
