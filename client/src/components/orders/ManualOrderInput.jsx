"use client";
import { useState, useEffect } from "react";
import { IoIosSend } from "react-icons/io";
import { RiLoader2Fill } from "react-icons/ri";
import { useSocket } from "@/hooks/useSocket";
import { orderService } from "@/services/orderService";
import ShowMessage from "@/components/common/ShowMessage";

// ⚠️ এটা orderService.createManual() দিয়ে সরাসরি একটা REST API কল (POST
// /manual-single) — সকেটের কোনো সংযোগ নেই। আগে ভুলবশত সকেট কানেক্টেড আছে
// কিনা চেক করে ইনপুট ডিজেবল রাখা হতো, যেটার আসলে কোনো দরকার ছিল না — এখন
// সেই ডিপেন্ডেন্সি সরিয়ে দেওয়া হলো।
export default function ManualOrderInput({ onUpdate }) {
  const { socket } = useSocket();
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    setMessage("");
  };
  const showTemporaryMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), text.startsWith("✅") ? 4000 : 3000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!isClient) return;
    if (inputValue.length < 11) {
      showTemporaryMessage("⚠️ অনুগ্রহ করে অর্ডার বিবরণ লিখুন।");
      setLoading(false);
      return;
    }

    try {
      const httpResponse = await orderService.createManual(inputValue);

      if (httpResponse.status === 201) {
        showTemporaryMessage(`✅ ${httpResponse.data?.message}`);
        const createdOrders = Array.isArray(httpResponse.data?.order)
          ? httpResponse.data.order
          : [httpResponse.data?.order].filter(Boolean);
        if (onUpdate) createdOrders.forEach((o) => onUpdate(o));

        setInputValue("");
      } else {
        showTemporaryMessage(
          `❌ অর্ডার তৈরি করার সময় অপ্রত্যাশিত HTTP স্ট্যাটাস: ${httpResponse.status}`,
        );
      }
    } catch (error) {
      console.error(
        "Manual order submission failed:",
        error.response?.data || error.message,
      );
      const errorMessage =
        error.response?.data?.message ||
        "অর্ডার তৈরি করার সময় সার্ভার ত্রুটি হয়েছে।";
      showTemporaryMessage(`❌ ত্রুটি: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusText = isClient
    ? socket?.connected
      ? "Connected"
      : "Disconnected"
    : "Loading...";

  const isInputDisabled = inputValue.trim() === "" || loading || !isClient;
  return (
    <div className=" w-full">
      {message && (
        <ShowMessage
          message={message}
          type={message.startsWith("✅") ? "success" : "error"}
        />
      )}

      <form onSubmit={handleSubmit} className="flex items-end">
        <textarea
          id="manual-input"
          value={inputValue}
          onChange={handleInputChange}
          rows="1"
          placeholder=" এখানে লিখুন..."
          className="flex-grow  pt-2 ps-1.5 text-sm md:p-2 border border-gray-300 rounded-md shadow-inner ease-in-out md:text-base h-14  overflow-y-auto disabled:bg-gray-100 disabled:cursor-not-allowed"
          required
          disabled={loading || !isClient}
        />

        <div className="flex flex-col h-full items-center juctify-center">
          <span className={`font-mono text-gray-600  text-[10px]`}>
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
