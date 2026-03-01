"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { IoIosSend } from "react-icons/io";
import { RiLoader2Fill } from "react-icons/ri";
import { useSocket } from "../hooks/useSocket";

export default function ManualInput({ onUpdate }) {
  // Socket Hook Access
  const { socket, isConnected } = useSocket();
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Client Side Rendering check
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Input Change Handler
  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    setMessage(""); // Clear message on input
  };

  // Form Submission Handler
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!isClient) return;
    if (!socket?.connected) {
      setMessage("❌ সকেট সার্ভারের সাথে সংযোগ নেই।");
      setTimeout(() => {
        setMessage("");
      }, 3000);
      setLoading(false);
      return;
    } 

    // Check if input is empty after trim
    if (inputValue.length < 11 || inputValue.trim().split(/\s+/).length < 2 ) {
      setMessage("⚠️ অনুগ্রহ করে অর্ডার বিবরণ লিখুন।");

      setTimeout(() => {
        setMessage("");
      }, 3000);
      setLoading(false);
      return;
    }

    const dataToSend = {
      rawInputText: inputValue,
    };

    // --------- send data to server (steadfast) ---------
    // 1. HTTP POST Request (ডেটাবেসে সেভ করার জন্য)
    try {
      // 2. HTTP POST Request (ডেটাবেসে সেভ করার জন্য)
      const httpResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/manual-single`,
        dataToSend,
      );
      if (httpResponse.status === 201) {
        setMessage(`${httpResponse.data?.message}`);
        if (onUpdate) {
          onUpdate(httpResponse.data?.order);
        }
        setTimeout(() => {
          setMessage("");
        }, 4000);
        setInputValue(""); // ইনপুট খালি করা
      } else {
        setMessage(
          `❌ অর্ডার তৈরি করার সময় অপ্রত্যাশিত HTTP স্ট্যাটাস: ${httpResponse.status}`,
        );
      }
    } catch (error) {
      console.error(
        "Manual order submission failed:manualinput.js",
        error.response?.data || error.message,
      );
      const errorMessage = error.response?.data?.message
        ? error.response.data.message
        : "অর্ডার তৈরি করার সময় সার্ভার ত্রুটি হয়েছে।";

      setMessage(`❌ ত্রুটি: ${errorMessage}`);
      setTimeout(() => {
        setMessage("");
      }, 4000);
    } finally {
      setLoading(false);
    }
  };

  // --- Hydration Fixed Rendering Logic ---
  const renderStatusText = isClient
    ? socket?.connected
      ? "Connected"
      : "Disconnected"
    : "Loading...";

  const isInputDisabled =
    !socket?.connected || inputValue.trim() === "" || loading || !isClient;
  const statusColor = isClient
    ? socket?.connected
      ? "text-green-600"
      : "text-red-600"
    : "text-gray-500";

  return (
    <div className=" w-full">
      {/* Message Display Area (Floating above input) */}
      {message && (
        <div
          className={`mt-2 mb-2 p-2 rounded-lg text-sm font-medium transition duration-300 shadow-md ${
            message.startsWith("✅")
              ? "bg-green-100 border-l-4 border-green-500 text-green-700"
              : "bg-red-100 border-l-4 border-red-500 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/*  ইনপুট ফর্ম */}
      <form onSubmit={handleSubmit} className="flex items-end">
        {/* টেক্সট এরিয়া - হোয়াটসঅ্যাপ মেসেজ বক্সের মতো */}

        <textarea
          id="manual-input"
          value={inputValue}
          onChange={handleInputChange}
          rows="1"
          placeholder=" এখানে লিখুন..."
          // transition-all duration-300 focus:h-36 focus:border-gray-500
          className="flex-grow  pt-2 ps-1.5 text-sm md:p-2 border border-gray-300 rounded-md shadow-inner ease-in-out md:text-base h-14  overflow-y-auto disabled:bg-gray-100 disabled:cursor-not-allowed"
          required
          disabled={loading || !isClient}
        />

        {/* সাবমিট বাটন (ফ্লোটিং বাটন স্টাইল) */}
        <div className="flex flex-col h-full items-center juctify-center">
          <span className={`font-mono ${statusColor}  text-[10px]`}>
            {/* <span
            className={`w-2 h-2 rounded-full mr-1 ${
              isConnected ? "bg-green-500" : "bg-red-500"
            } animate-pulse`}
          ></span> */}
            {renderStatusText}
          </span>
          <button
            type="submit"
            disabled={isInputDisabled}
            className={`flex-shrink-0 p-2  md:p-3 rounded-full shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
              isInputDisabled
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 transform hover:scale-105"
            }`}
          >
            {loading ? (
              <RiLoader2Fill className="h-6 w-6 animate-spin" />
            ) : (
              <IoIosSend className="h-6 w-6" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
