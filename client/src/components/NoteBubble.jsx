"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSocket } from "@/hooks/useSocket";

import { MdAddIcCall } from "react-icons/md";
import {
  formatTime,
  formatDate,
  dahsbOrderActionButton,
} from "@/constants/data";

// API Endpoint Configuration
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/orders`;

function NoteBubble({ order, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // console.log("order", order);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    socket.on("orderUpdated", (data) => {
      if (onUpdate) {
        onUpdate(data.order);
      }
    });

    return () => {
      socket.off("orderUpdated");
    };
  }, []);

  // Modal State

  // --- অর্ডার ডিলিট করার হ্যান্ডেলার (কনফার্মেশন চাইবে) ---

  // অ্যাক্টিভিটি টাইমলাইন তৈরি (নতুনটি উপরে)
  const sortedActivities = [...(order.activities || [])].sort(
    (a, b) => new Date(b?.timestamp) - new Date(a?.timestamp),
  );

  const HandelCopy = async (number, text) => {
    try {
      // click to copy data
      text && (await navigator.clipboard.writeText(text));
      number && (await navigator.clipboard.writeText(number));
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handelSolve = () => {
    // e.stopPropagation();
    console.log("handelSolve");
  };

  return (
    <>
      <div className="bg-white  rounded-lg shadow-lg p-2 md:p-4 mb-1 border border-gray-300 hover:shadow-xl transition-all duration-300">
        {/* --- অর্ডার ডিসপ্লে / এডিট মোড --- */}

        <>
          <div
            className={`cursor-pointer  ${
              loading ? "opacity-70 pointer-events-none" : ""
            }`}
            onClick={() => !loading && setIsExpanded(!isExpanded)}
          >
            {/* steadFast id */}
            <div className="flex justify-between">
              <div className="">
                {order?.courier?.trackingId && (
                  <div className="text-sm font-medium flex items-center gap-1">
                    <p>ID : </p>
                    <p
                      className="text-blue-600"
                      onClick={() =>
                        navigator.clipboard.writeText(order.courier.trackingId)
                      }
                    >
                      {order?.courier?.trackingId}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => (e.stopPropagation(), handelSolve())}
                className="bg-green-700 text-white px-3 rounded-md"
              >
                Solve
              </button>
            </div>
            <div className="flex justify-between items-start">
              {/* স্ট্যাটাস */}
              <div className="">
                <div className="flex gap-2">
                  <p className="text-sm text-gray-800">
                    <span> {order.castomerName} </span> --
                    <span> {order.totalCOD} </span> --
                    <span className="text-purple-600">{order.productCode}</span>
                  </p>
                  <div>
                    {order?.courierHistory?.our > 0 && (
                      <span className="text-xs text-black  font-medium bg-green-300 px-2 py-0.5 rounded-lg">
                        <span className="text-green-700">
                          {order?.courierHistory?.our}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* টাইমস্ট্যাম্প */}
              <div className="text-xs  font-medium flex flex-col">
                <span className="text-green-500">
                  {`${formatTime(order.activities[order.activities.length - 1].timestamp)}`}
                </span>
              </div>
            </div>
            {/* show number */}
            <div className="flex items-center gap-1">
              {Array.isArray(order.castomerPhone)
                ? order.castomerPhone.map((phone, index) => (
                    <p
                      key={index}
                      className="text-sm font-medium text-blue-600 hover:underline"
                      onClick={(e) => (e.stopPropagation(), HandelCopy(phone))}
                    >
                      {index > 0 && " |"} {phone}
                    </p>
                  ))
                : order.castomerPhone.split(", ").map((phone, index) => (
                    <p
                      key={index}
                      className="text-sm font-medium text-blue-600 hover:underline"
                      onClick={(e) => (e.stopPropagation(), handleCopy(phone))}
                    >
                      {index > 0 && " |"} {phone}
                    </p>
                  ))}
            </div>
            <p className="text-sm font-bold text-gray-600 ">
              {order.activities[order.activities.length - 1].description}
            </p>
          </div>

          {/* --- অ্যাকশন বাটন সেকশন --- */}
          <div className="flex justify-between mt-1 pt-1 border-t border-gray-100">
            <div className="flex space-x-2">
              {/* call and number copy */}
              <a
                href={`tel:${Array.isArray(order.castomerPhone) ? order.castomerPhone[0] : order.castomerPhone.split(", ")[0]}`}
                onClick={() => HandelCopy(order.castomerPhone, shortcut.value)}
                className="py-2 px-4 text-sm rounded-full bg-blue-200 text-blue-600 hover:bg-blue-200 transition duration-150 shadow-md"
                title="সরাসরি কল করুন"
              >
                <MdAddIcCall />
              </a>
            </div>
            {/* ডান দিকের বাটন*/}
          </div>
          {/* শর্টকাট স্ট্যাটাস বাটন */}
          <div className="flex flex-wrap gap-1  mt-2">
            {dahsbOrderActionButton.map((shortcut, index) => (
              <button
                key={index}
                onClick={() => HandelCopy(order.castomerPhone)}
                className={`text-white text-xs font-medium py-1.5 px-2 md:px-3 rounded-lg  md:rounded-sm shadow-md transition duration-200  cursor-pointer bg-yellow-600 hover:bg-yellow-800 hover:shadow-lg `}
              >
                {shortcut.label}
              </button>
            ))}
          </div>

          {/* --- কলাপসিবল ডিটেইলস সেকশন --- */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? "opacity-100 overflow-auto" : "max-h-0 opacity-0"
            }`}
          >
            <div className="mt-2 pt-2 border-t border-gray-300">
              {/* display nots */}
              <p className="text-xs"> Note :- {order?.note} </p>
              {/* টাইমলাইন এবং নোট সেকশন */}
              <div className="space-y-4 max-h-[60vh]  overflow-y-auto mt-1 pt-2">
                {sortedActivities.map((activity, index) => (
                  <div key={index} className="flex items-start text-xs">
                    <div className="w-1/4 flex flex-col">
                      {/* formate date */}
                      <span className={` font-bold text-gray-500 `}>
                        {formatDate(activity.timestamp)}
                      </span>
                      {/* formate time */}
                      <span className={` font-bold`}>
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                    {/* right section */}
                    <div className="w-3/4 pl-3 border-l-2 border-dashed border-gray-200">
                      <p className="font-semibold text-gray-800">
                        <span className="text-purple-600">
                          {" "}
                          {activity?.actor || activity?.author}
                        </span>{" "}
                        - {activity?.type}
                      </p>
                      <p className="text-gray-600 mt-0.5">
                        {/* {activity?.actor || activity?.author} */}
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
                {sortedActivities.length === 0 && (
                  <p className="text-xs text-gray-500 italic">
                    এই অর্ডারের জন্য কোনো অ্যাক্টিভিটি রেকর্ড করা হয়নি।
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      </div>
    </>
  );
}

export default NoteBubble;
