"use client";
import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { STATUS_SHORTCUTS } from "@/constants/orderConstants";
import { useOrderActions } from "@/hooks/useOrderActions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import DisplayTime from "@/components/common/DisplayTime";
import ConfirmModal from "@/components/common/ConfirmModal";
import OrderEditForm from "./OrderEditForm";
import OrderActions from "./OrderActions";
import ScheduleModal from "./ScheduleModal";
import OrderActivityTimeline from "./OrderActivityTimeline";
import OrderPhoneList from "./OrderPhoneList";
import FraudDetectionModal from "./FraudDetectionModal";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { showToast } from "@/lib/toast";
import DisplayAgoTime from "../common/DisplayAgoTime";

const STATUS_COLOR_MAP = {
  Pending: "text-yellow-600 bg-yellow-100",
  Confirmed: "text-green-600 bg-green-200",
  Booked: "text-green-600 bg-green-200",
  Cancelled: "text-red-600 bg-red-100",
};

function getStatusColor(status) {
  return STATUS_COLOR_MAP[status] || "text-indigo-600 bg-indigo-100";
}

export default function OrderCard({ order, onUpdate, setSearchQuery }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFraudModalOpen, setIsFraudModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleNote, setScheduleNote] = useState("");
  const [formData, setFormData] = useState({
    castomerName: order.castomerName,
    castomerPhone: Array.isArray(order.castomerPhone)
      ? order.castomerPhone
      : order.castomerPhone
        ? order.castomerPhone.split(",").map((p) => p.trim())
        : [""],
    totalCOD: order.totalCOD,
    productCode: order.productCode,
    rawInputText: order.rawInputText,
    permanentNote: order?.permanentNote || "",
  });
  const [touchedPhones, setTouchedPhones] = useState(
    new Array(formData.castomerPhone.length).fill(false),
  );
  const [modal, setModal] = useState({
    isVisible: false,
    type: "",
    message: "",
    action: null,
  });

  const {
    loading,
    historyLoading,
    updateStatus,
    addNote,
    fetchCourierHistory,
    updateOrder,
    deleteOrder,
    bookCourier,
    scheduleOrder,
  } = useOrderActions(order, onUpdate);

  const showMessage = (type, message, action = null) => {
    setModal({ isVisible: true, type, message, action });
  };
  const closeModal = () =>
    setModal({ isVisible: false, type: "", message: "", action: null });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "totalCOD" ? Number(value) : value,
    }));
  };

  const handlePhoneChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");
    setFormData((prev) => {
      const updated = [...prev.castomerPhone];
      updated[index] = cleaned;
      return { ...prev, castomerPhone: updated };
    });
    setTouchedPhones((prev) => {
      const copy = [...prev];
      copy[index] = true;
      return copy;
    });
  };

  const handlePhoneFocus = (index) => {
    setTouchedPhones((prev) => {
      const copy = [...prev];
      copy[index] = true;
      return copy;
    });
  };

  const handleAddPhone = () => {
    setFormData((prev) => ({
      ...prev,
      castomerPhone: [...prev.castomerPhone, ""],
    }));
    setTouchedPhones((prev) => [...prev, true]);
  };

  const handleDeletePhone = (index) => {
    setFormData((prev) => {
      const updated = prev.castomerPhone.filter((_, i) => i !== index);
      return { ...prev, castomerPhone: updated.length ? updated : [""] };
    });
  };

  const handleSaveEdit = async () => {
    const invalid = formData.castomerPhone.some(
      (phone, index) => touchedPhones[index] && !/^\d{11}$/.test(phone),
    );
    if (invalid) {
      alert("কোন একটা নাম্বার 11 ডিজিট নয়");
      return;
    }
    if (
      !formData.castomerName ||
      !formData.castomerPhone ||
      !formData.totalCOD ||
      !formData.productCode
    ) {
      showToast("সবগুলি ফিল্ড পূরণ করুন", { position: "top" });
      toast.error("সবগুলি ফিল্ড পূরণ করুন");
      return;
    }

    const result = await updateOrder(formData);
    if (result.success) {
      showToast("Updated", { position: "top" });
      setIsEditing(false);
    } else {
      showMessage("alert", `ত্রুটি: ${result.message}`, null);
    }
  };

  const handleStatusUpdate = (shortcut) => {
    if (shortcut.key === "Custom" && !noteText) {
      toast.error("আগে কমেন্ট লিখুন");
      return;
    }
    updateStatus(shortcut, noteText);
    setNoteText("");
  };

  const handleBooking = async () => {
    if (order.orderStatus === "Booked") {
      showMessage("alert", "অর্ডারটি আগে বুকিং করা", null);
      return;
    }
    if (order.orderStatus !== "Confirmed") {
      showMessage("alert", "অর্ডারটি আগে কনফর্ম করুন", null);
      return;
    }
    const result = await bookCourier();
    if (!result.success && result.message) {
      showMessage("alert", `ত্রুটি: ${result.message}`, null);
    }
  };

  const handleAddNote = () => {
    if (!noteText) {
      toast.error("নোট লিখুন");
      return;
    }
    addNote(noteText);
    setNoteText("");
  };

  const executeDelete = async () => {
    const result = await deleteOrder();
    showMessage("alert", result.message, null);
  };

  const handleDeleteOrder = () => {
    showMessage(
      "confirm",
      "আপনি কি নিশ্চিত যে আপনি এই অর্ডারটি ডিলিট করতে চান? এই অ্যাকশনটি অপরিবর্তনীয়।",
      executeDelete,
    );
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleDate) {
      alert("অনুগ্রহ করে আগে তারিখ নির্বাচন করুন");
      return;
    }
    await scheduleOrder(scheduleDate, scheduleNote);
    setIsModalOpen(false);
  };
  const lastActivity = order.activities?.[order.activities.length - 1];
  const statusColor = getStatusColor(order.orderStatus);

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-2 md:p-4 border border-gray-300 hover:shadow-xl transition-all duration-300 mb-1">
        {isEditing ? (
          <OrderEditForm
            formData={formData}
            touchedPhones={touchedPhones}
            loading={loading}
            onFormChange={handleFormChange}
            onPhoneChange={handlePhoneChange}
            onPhoneFocus={handlePhoneFocus}
            onAddPhone={handleAddPhone}
            onDeletePhone={handleDeletePhone}
            onSave={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <>
            <div
              className={`cursor-pointer ${loading ? "opacity-70 pointer-events-none" : ""}`}
              onClick={() => !loading && setIsExpanded(!isExpanded)}
            >
              {/* স্ট্যাটাস রো */}
              <div className="flex justify-between items-start mb-1 ">
                <div className="flex gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${statusColor}`}
                  >
                    {order.orderStatus}
                  </span>

                  {order?.courierHistory?.our > 0 && (
                    <span className="text-xs text-black gap-3 font-medium bg-green-300 px-2 py-0.5 rounded-lg">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery(order.castomerPhone[0]);
                        }}
                        className="text-green-700"
                      >
                        {order?.courierHistory?.our}
                      </span>
                    </span>
                  )}

                  <div>
                    {order?.courierHistory?.all ? (
                      <span className="text-xs text-black gap-3 font-medium bg-gray-200 px-2 py-0.5 rounded-lg">
                        <span> All </span>
                        <span className="text-green-700">
                          {order?.courierHistory?.all?.success}
                        </span>
                        /
                        <span className="text-red-600">
                          {order?.courierHistory?.all?.cancel}
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchCourierHistory();
                        }}
                        className="bg-green-500 text-white text-sm px-2 py-1 rounded-md cursor-pointer"
                      >
                        {historyLoading ? <LoadingSpinner /> : "History"}
                      </button>
                    )}
                  </div>

                  {order?.courier?.courierStatus &&
                    order.courier.courierStatus !== "unknown" && (
                      <div className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-amber-300 text-blue-900">
                        {order.courier.courierStatus}
                      </div>
                    )}

                  {order?.fraudCheck?.isSuspicious &&
                    order.fraudCheck.reviewStatus !== "approved" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFraudModalOpen(true);
                        }}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-sm cursor-pointer ${
                          order.fraudCheck.reviewStatus === "blocked"
                            ? "bg-red-600 text-white"
                            : order.fraudCheck.reviewStatus === "ignored"
                              ? "bg-gray-300 text-gray-700"
                              : "bg-red-100 text-red-700 animate-pulse"
                        }`}
                        title="Multiple Orders Detected — বিস্তারিত দেখতে ক্লিক করুন"
                      >
                        ⚠️ Multiple Orders
                      </button>
                    )}
                </div>
                <div className="text-xs font-medium flex flex-col">
                  <DisplayTime timeStamp={order.activities[0]?.timestamp} />
                  <DisplayAgoTime timeStamp={order.activities[0]?.timestamp} />
                </div>
              </div>

              <p className="text-sm font-bold text-gray-800">
                <span> {order.castomerName} </span> --
                <span> {order.totalCOD} </span> --
                <span className="text-purple-600"> {order.productCode} </span>
              </p>
              {/* phone number list*/}
              <OrderPhoneList castomerPhone={order.castomerPhone} />

              <p className="text-xs text-gray-600 mt-1 h-10">
                {order?.rawInputText || "পাওয়া যায়নি"}
              </p>
            </div>

            {/* actions : call, edit, booking, schedule, delete */}
            <div className="relative">
              <OrderActions
                order={order}
                loading={loading}
                isCopied={isCopied}
                onEdit={() => setIsEditing(true)}
                onBooking={handleBooking}
                onSchedule={() => setIsModalOpen(true)}
                onDelete={handleDeleteOrder}
                setIsCopied={setIsCopied}
              />

              {isModalOpen && (
                <ScheduleModal
                  date={scheduleDate}
                  note={scheduleNote}
                  onDateChange={setScheduleDate}
                  onNoteChange={setScheduleNote}
                  onCancel={() => setIsModalOpen(false)}
                  onSubmit={handleScheduleSubmit}
                />
              )}
            </div>

            {order?.permanentNote && (
              <div>
                <p className="text-sm text-red-700">{order.permanentNote}</p>
              </div>
            )}
            {/* order status change buttons */}
            <div className="flex flex-wrap gap-1 mt-2">
              {STATUS_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.key}
                  onClick={() => handleStatusUpdate(shortcut)}
                  className={`text-white text-xs font-medium py-1.5 px-2 md:px-3 rounded-lg md:rounded-full shadow-md transition duration-200 cursor-pointer ${
                    shortcut.color
                  } ${loading ? "opacity-50 cursor-not-allowed" : "hover:ring-2 ring-offset-1 ring-opacity-50"}`}
                  disabled={loading}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>

            {lastActivity && (
              <div className="flex justify-between items-start">
                <span className="text-sm">{lastActivity.description}</span>
                <div className="fflex flex-col">
                  <DisplayTime timeStamp={lastActivity.timestamp} />
                  <DisplayAgoTime timeStamp={lastActivity.timestamp} />
                </div>
              </div>
            )}

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? "opacity-100 overflow-auto" : "max-h-0 opacity-0"
              }`}
            >
              <div className="mt-2 pt-2 border-t border-gray-300">
                {order?.courier?.trackingId && (
                  <div className="text-sm font-medium flex items-center gap-1">
                    <p>SteadFast id : </p>
                    <p
                      className="text-blue-600 cursor-pointer"
                      onClick={() => copyToClipboard(order.courier.trackingId)}
                    >
                      {order.courier.trackingId}
                    </p>
                  </div>
                )}
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="কমেন্ট লিখুন..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full pl-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-200 focus:border-indigo-200 transition duration-150 text-sm"
                  />
                  <button
                    onClick={handleAddNote}
                    className="cursor-pointer hover:bg-green-600 bg-green-500 text-gray-50 px-2 rounded-md"
                  >
                    Note
                  </button>
                </div>

                <p className="text-xs"> Note :- {order?.note} </p>

                <OrderActivityTimeline activities={order.activities} />
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isVisible={modal.isVisible}
        type={modal.type}
        message={modal.message}
        onConfirm={modal.type === "confirm" ? modal.action : closeModal}
        onCancel={closeModal}
      />

      {isFraudModalOpen && (
        <FraudDetectionModal
          order={order}
          onClose={() => setIsFraudModalOpen(false)}
          onUpdate={onUpdate}
        />
      )}

      <ToastContainer autoClose={800} />
    </>
  );
}
