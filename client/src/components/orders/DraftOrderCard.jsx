"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaCheck,
  FaCopy,
  FaEdit,
  FaMapMarkerAlt,
  FaMinus,
  FaPhoneAlt,
  FaPlus,
  FaSave,
  FaTimes,
  FaTrash,
  FaUser,
  FaBoxOpen,
  FaHistory,
} from "react-icons/fa";
import DisplayTime from "@/components/common/DisplayTime";
import ConfirmModal from "@/components/common/ConfirmModal";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { useOrders } from "@/context/OrderContext";
import {
  DRAFT_CALL_STATUS_SHORTCUTS,
  DRAFT_CALL_STATUS_META,
} from "@/constants/orderConstants";
import { formatDate, formatTime } from "@/utils/dateUtils";

const PHONE_REGEX = /^01[3-9]\d{8}$/;

const getFormData = (draft) => ({
  name: draft?.name || "",
  phone: draft?.phone || "",
  address: draft?.address || "",
  quantity: Math.max(1, Number(draft?.quantity) || 1),
  productTypeId: draft?.productTypeId || "",
  deliveryArea: draft?.deliveryArea === "outside" ? "outside" : "inside",
});

function RequiredLabel({ children }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-gray-600">
      {children} <span className="text-red-500">*</span>
    </label>
  );
}

// --- কল-স্ট্যাটাসের ইতিহাস (কবে কল ধরেনি/ফোন বন্ধ ছিল/কি কথা হয়েছে/বাতিল হয়েছে) ---
function CallLogTimeline({ logs }) {
  const sorted = [...(logs || [])].sort(
    (a, b) => new Date(b?.at) - new Date(a?.at),
  );

  if (sorted.length === 0) {
    return (
      <p className="text-xs italic text-gray-500">
        এখনো কোনো কল-স্ট্যাটাস লগ করা হয়নি।
      </p>
    );
  }

  return (
    <div className="mt-1 max-h-[50vh] space-y-3 overflow-y-auto pt-1">
      {sorted.map((log, index) => {
        const meta = DRAFT_CALL_STATUS_META[log?.status] || {};
        return (
          <div key={index} className="flex items-start text-xs">
            <div className="flex w-1/4 flex-col">
              <span className="font-bold text-gray-500">
                {formatDate(log?.at)}
              </span>
              <span className="font-bold">{formatTime(log?.at)}</span>
            </div>
            <div className="w-3/4 border-l-2 border-dashed border-gray-200 pl-3">
              <p className="font-semibold text-gray-800">
                <span
                  className={`rounded px-1.5 py-0.5 ${meta.color || "bg-gray-100 text-gray-600"}`}
                >
                  {meta.label || log?.status}
                </span>
                {log?.by && (
                  <span className="ml-2 text-purple-600">— {log.by}</span>
                )}
              </p>
              {log?.note && (
                <p className="mt-0.5 text-gray-600">{log.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DraftOrderCard({ draft }) {
  const {
    deleteDraftOrder,
    updateDraftOrder,
    updateDraftCallStatus,
    convertDraftOrder,
    setSearchQuery,
  } = useOrders();

  const page = draft?.landingPage || {};
  const productTypes = Array.isArray(page?.productTypes)
    ? page.productTypes
    : [];
  const hasProductTypes = productTypes.length > 0;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => getFormData(draft));
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelCallModal, setShowCancelCallModal] = useState(false);
  const [callNoteText, setCallNoteText] = useState("");
  const [isCallUpdating, setIsCallUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) setFormData(getFormData(draft));
  }, [draft, isEditing]);

  const phone = formData.phone.trim();
  const phoneValid = PHONE_REGEX.test(phone);

  const selectedType = useMemo(
    () =>
      hasProductTypes
        ? productTypes.find(
            (type) => String(type?._id) === String(formData.productTypeId),
          ) || null
        : null,
    [hasProductTypes, productTypes, formData.productTypeId],
  );

  const price = selectedType?.price ?? Number(page?.price || 0);
  const freeDelivery = selectedType
    ? selectedType.freeDelivery !== false
    : page?.freeDelivery !== false;
  const deliveryCharge = freeDelivery
    ? 0
    : formData.deliveryArea === "outside"
      ? Number(
          selectedType?.deliveryChargeOutsideDhaka ??
            page?.deliveryChargeOutsideDhaka ??
            0,
        )
      : Number(
          selectedType?.deliveryChargeInsideDhaka ??
            page?.deliveryChargeInsideDhaka ??
            0,
        );
  const totalCOD =
    price * Math.max(1, Number(formData.quantity) || 1) + deliveryCharge;

  const hasChanges = useMemo(() => {
    const original = getFormData(draft);
    return (
      formData.name !== original.name ||
      formData.phone !== original.phone ||
      formData.address !== original.address ||
      formData.quantity !== original.quantity ||
      formData.productTypeId !== original.productTypeId ||
      formData.deliveryArea !== original.deliveryArea
    );
  }, [draft, formData]);

  const callStatus = draft?.callStatus || "none";
  const callStatusMeta =
    DRAFT_CALL_STATUS_META[callStatus] || DRAFT_CALL_STATUS_META.none;

  const updateField = (field, value) => {
    setError("");
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopyPhone = () => {
    if (phone) copyToClipboard(phone);
  };

  const handleSearchThisNumber = () => {
    if (phone) setSearchQuery(phone);
  };

  const startEditing = () => {
    setFormData(getFormData(draft));
    setError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormData(getFormData(draft));
    setError("");
    setIsEditing(false);
  };

  const validate = () => {
    if (!formData.name.trim()) return "কাস্টমারের নাম আবশ্যক।";
    if (!PHONE_REGEX.test(formData.phone.trim())) {
      return "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (013-019, মোট ১১ ডিজিট)।";
    }
    if (formData.address.trim().length < 10) {
      return "সম্পূর্ণ ঠিকানা দিন (কমপক্ষে ১০ অক্ষর)।";
    }
    if (
      !Number.isInteger(Number(formData.quantity)) ||
      Number(formData.quantity) < 1
    ) {
      return "সঠিক quantity নির্বাচন করুন।";
    }
    if (hasProductTypes && !selectedType) {
      return "প্রোডাক্ট টাইপ/প্যাকেজ নির্বাচন করা আবশ্যক।";
    }
    if (
      !freeDelivery &&
      !["inside", "outside"].includes(formData.deliveryArea)
    ) {
      return "ডেলিভারি এলাকা নির্বাচন করুন।";
    }
    if (!Number.isFinite(price) || price <= 0) {
      return "এই ল্যান্ডিং পেজে বৈধ প্রোডাক্ট মূল্য পাওয়া যায়নি।";
    }
    return "";
  };

  const payload = () => ({
    name: formData.name.trim(),
    phone: formData.phone.trim(),
    address: formData.address.trim(),
    quantity: Number(formData.quantity),
    productTypeId: hasProductTypes ? formData.productTypeId || null : null,
    deliveryArea: freeDelivery ? "inside" : formData.deliveryArea,
  });

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await updateDraftOrder(draft._id, payload());
      setIsEditing(false);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "ড্রাফট আপডেট করা যায়নি। আবার চেষ্টা করুন।",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvert = async () => {
    const validationError = validate();
    if (validationError) {
      setShowConvertModal(false);
      setIsEditing(true);
      setError(validationError);
      return;
    }

    setIsConverting(true);
    setError("");
    try {
      await convertDraftOrder(draft._id, payload());
      setShowConvertModal(false);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Pending-এ পাঠানো যায়নি। অর্ডারটি আবার চেষ্টা করুন।",
      );
      setShowConvertModal(false);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async () => {
    await deleteDraftOrder(draft._id);
    setShowDeleteModal(false);
  };

  // --- কল-স্ট্যাটাস শর্টকাট বাটনে ক্লিক করলে ---
  const performCallStatusUpdate = async (key, note) => {
    setIsCallUpdating(true);
    setError("");
    try {
      await updateDraftCallStatus(draft._id, key, note);
      setCallNoteText("");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "কল স্ট্যাটাস আপডেট করা যায়নি। আবার চেষ্টা করুন।",
      );
    } finally {
      setIsCallUpdating(false);
    }
  };

  const handleCallShortcutClick = (shortcut) => {
    setError("");
    if (shortcut.requireNote && !callNoteText.trim()) {
      setError("আগে কী কথা হয়েছে লিখুন।");
      return;
    }
    if (shortcut.key === "cancelled") {
      setShowCancelCallModal(true);
      return;
    }
    performCallStatusUpdate(shortcut.key, callNoteText);
  };

  const handleConfirmCancelCall = async () => {
    setShowCancelCallModal(false);
    await performCallStatusUpdate("cancelled", callNoteText);
  };

  return (
    <>
      <div className="mb-1 rounded-lg border border-gray-300 bg-white p-2 shadow-lg transition-all duration-300 hover:shadow-xl md:p-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2">
                <FaBoxOpen className="text-blue-600" size={14} />
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    অর্ডারের পণ্য ও মূল্য
                  </p>
                  <p className="text-[11px] text-gray-500">
                    ল্যান্ডিং পেইজের বর্তমান সেটিং অনুযায়ী হিসাব হবে
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <RequiredLabel>প্রোডাক্ট / প্যাকেজ</RequiredLabel>
                  {hasProductTypes ? (
                    <select
                      value={formData.productTypeId}
                      onChange={(e) =>
                        updateField("productTypeId", e.target.value)
                      }
                      disabled={isSaving || isConverting}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    >
                      <option value="">— প্যাকেজ নির্বাচন করুন —</option>
                      {productTypes.map((type) => (
                        <option key={type._id} value={type._id}>
                          {type.label} — ৳{type.price}
                          {type.freeDelivery !== false
                            ? " + Free Delivery"
                            : " + Delivery Charge"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800">
                      {page?.productName || draft?.productName || "প্রোডাক্ট"}
                    </div>
                  )}
                </div>

                <div>
                  <RequiredLabel>Quantity</RequiredLabel>
                  <div className="flex h-[42px] w-fit items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "quantity",
                          Math.max(1, Number(formData.quantity) - 1),
                        )
                      }
                      disabled={isSaving || isConverting}
                      className="flex h-full w-11 items-center justify-center bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <FaMinus size={11} />
                    </button>
                    <span className="flex h-full min-w-14 items-center justify-center border-x border-gray-200 px-3 text-sm font-bold">
                      {formData.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateField("quantity", Number(formData.quantity) + 1)
                      }
                      disabled={isSaving || isConverting}
                      className="flex h-full w-11 items-center justify-center bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                    >
                      <FaPlus size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {!freeDelivery && (
                <div className="mt-3">
                  <RequiredLabel>ডেলিভারি এলাকা</RequiredLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateField("deliveryArea", "inside")}
                      disabled={isSaving || isConverting}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                        formData.deliveryArea === "inside"
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      ঢাকার ভেতরে — ৳
                      {Number(
                        selectedType?.deliveryChargeInsideDhaka ??
                          page?.deliveryChargeInsideDhaka ??
                          0,
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("deliveryArea", "outside")}
                      disabled={isSaving || isConverting}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                        formData.deliveryArea === "outside"
                          ? "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-100"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      ঢাকার বাইরে — ৳
                      {Number(
                        selectedType?.deliveryChargeOutsideDhaka ??
                          page?.deliveryChargeOutsideDhaka ??
                          0,
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-white p-2.5 ring-1 ring-gray-100">
                  <p className="text-[10px] text-gray-400">ইউনিট মূল্য</p>
                  <p className="mt-0.5 text-sm font-bold">৳{price || 0}</p>
                </div>
                <div className="rounded-xl bg-white p-2.5 ring-1 ring-gray-100">
                  <p className="text-[10px] text-gray-400">ডেলিভারি</p>
                  <p className="mt-0.5 text-sm font-bold">
                    {freeDelivery ? "ফ্রি" : `৳${deliveryCharge}`}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl bg-indigo-600 p-2.5 text-white">
                  <p className="text-[10px] text-indigo-100">মোট COD</p>
                  <p className="mt-0.5 text-base font-extrabold">
                    ৳{totalCOD || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <RequiredLabel>কাস্টমারের নাম</RequiredLabel>
                <div className="relative">
                  <FaUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    disabled={isSaving || isConverting}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    placeholder="কাস্টমারের নাম"
                  />
                </div>
              </div>

              <div>
                <RequiredLabel>মোবাইল নম্বর</RequiredLabel>
                <div className="relative">
                  <FaPhoneAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={formData.phone}
                    onChange={(e) =>
                      updateField(
                        "phone",
                        e.target.value.replace(/\D/g, "").slice(0, 11),
                      )
                    }
                    disabled={isSaving || isConverting}
                    className={`w-full rounded-xl border bg-gray-50 py-2.5 pl-9 pr-10 text-sm outline-none focus:bg-white focus:ring-2 ${
                      formData.phone && !phoneValid
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : phoneValid
                          ? "border-green-300 focus:border-green-500 focus:ring-green-100"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                    placeholder="01XXXXXXXXX"
                  />
                  {formData.phone && (
                    <span
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${phoneValid ? "text-green-600" : "text-red-500"}`}
                    >
                      {phoneValid ? <FaCheck size={12} /> : "!"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <RequiredLabel>সম্পূর্ণ ঠিকানা</RequiredLabel>
              <div className="relative">
                <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-3 text-gray-400" />
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  disabled={isSaving || isConverting}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  placeholder="জেলা, থানা, এলাকা/গ্রাম..."
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="font-semibold text-gray-700">
                    Landing Page:
                  </span>{" "}
                  {draft?.landingPageSlug || "—"}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Product Code:
                  </span>{" "}
                  {page?.productCode || "—"}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving || isConverting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                <FaTimes size={12} /> বাতিল
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isConverting || !hasChanges}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <FaSave size={12} />{" "}
                {isSaving ? "সেভ হচ্ছে..." : "পরিবর্তন সেভ করুন"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* --- স্ট্যাটাস রো (OrderCard-এর মতো একই প্যাটার্ন) --- */}
            <div
              className={`cursor-pointer ${isCallUpdating ? "pointer-events-none opacity-70" : ""}`}
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    ইনকমপ্লিট
                  </span>
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${callStatusMeta.color}`}
                  >
                    {callStatusMeta.label}
                  </span>
                  {draft?.callAttempts > 0 && (
                    <span className="rounded-lg bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {draft.callAttempts}বার কল করা হয়েছে
                    </span>
                  )}
                  {hasProductTypes && !draft?.productTypeId && (
                    <span className="rounded-sm bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                      প্যাকেজ নির্বাচন বাকি
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end text-xs font-medium">
                  <DisplayTime
                    timeStamp={draft?.lastActivityAt || draft?.updatedAt}
                  />
                </div>
              </div>

              <p className="text-sm font-bold text-gray-800">
                <span>{draft?.name || "নাম দেওয়া হয়নি"}</span> --
                <span> ৳{totalCOD || 0} </span> --
                <span className="text-purple-600">
                  {" "}
                  {draft?.productTypeLabel ||
                    page?.productName ||
                    draft?.productName ||
                    "—"}{" "}
                </span>
              </p>

              {draft?.phone ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSearchThisNumber();
                  }}
                  className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  <FaPhoneAlt size={11} /> {draft.phone}
                </button>
              ) : (
                <p className="mt-0.5 text-sm text-gray-400">নম্বর নেই</p>
              )}

              <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                {draft?.address || "ঠিকানা দেওয়া হয়নি"}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                  পরিমাণ: {draft?.quantity || 1}টি
                </span>
                {draft?.deliveryArea === "outside" && (
                  <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                    ঢাকার বাইরে
                  </span>
                )}
              </div>
            </div>

            {/* --- অ্যাকশন রো: কল, কপি, এডিট, পেন্ডিং-এ পাঠান, ডিলিট --- */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {phone && (
                <>
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                  >
                    <FaPhoneAlt size={11} /> কল করুন
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <FaCopy size={11} /> কপি
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <FaEdit size={11} /> Edit
              </button>
              <button
                type="button"
                onClick={() => setShowConvertModal(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-blue-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:from-indigo-700 hover:to-blue-700"
              >
                Pending-এ পাঠান <FaArrowRight size={10} />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center rounded-md bg-red-50 px-2.5 py-1.5 text-red-600 hover:bg-red-100"
                aria-label="ড্রাফট ডিলিট করুন"
                title="ড্রাফট ডিলিট করুন"
              >
                <FaTrash size={11} />
              </button>
            </div>

            {draft?.callNote && (
              <div className="mt-2 flex items-start justify-between gap-2">
                <span className="text-xs text-gray-600">
                  সর্বশেষ নোট: {draft.callNote}
                </span>
                <DisplayTime timeStamp={draft?.lastCallAt} />
              </div>
            )}

            {/* --- কল-স্ট্যাটাস নোট ইনপুট + শর্টকাট বাটন (OrderCard-এর STATUS_SHORTCUTS প্যাটার্ন) --- */}
            <div className="mt-2 flex gap-1">
              <input
                type="text"
                placeholder="কাস্টমারের সাথে কী কথা হয়েছে লিখুন (কথা হয়েছে/বাতিল করলে দরকার হতে পারে)..."
                value={callNoteText}
                onChange={(e) => {
                  setCallNoteText(e.target.value);
                  setError("");
                }}
                disabled={isCallUpdating}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm transition duration-150 focus:border-indigo-200 focus:ring-indigo-200 disabled:opacity-60"
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {DRAFT_CALL_STATUS_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.key}
                  type="button"
                  onClick={() => handleCallShortcutClick(shortcut)}
                  disabled={isCallUpdating}
                  className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium text-white shadow-md transition duration-200 md:rounded-full md:px-3 ${
                    shortcut.color
                  } ${
                    isCallUpdating
                      ? "cursor-not-allowed opacity-50"
                      : "ring-opacity-50 hover:ring-2 ring-offset-1"
                  }`}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* --- এক্সপ্যান্ড করলে কল হিস্টোরি টাইমলাইন --- */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? "opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="mt-2 border-t border-gray-200 pt-2">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-500">
                  <FaHistory size={10} /> কল হিস্টোরি
                </p>
                <CallLogTimeline logs={draft?.callLogs} />
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isVisible={showDeleteModal}
        type="confirm"
        message="এই ইনকমপ্লিট অর্ডারটি স্থায়ীভাবে ডিলিট হয়ে যাবে। নিশ্চিত?"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      <ConfirmModal
        isVisible={showConvertModal}
        type="confirm"
        message={`"${formData.name || "এই কাস্টমার"}"-এর ড্রাফট অর্ডারটি Pending Order-এ পাঠানো হবে। বর্তমান প্যাকেজ/quantity/ডেলিভারি তথ্য অনুযায়ী মোট COD ৳${totalCOD || 0} হবে। নিশ্চিত?`}
        onConfirm={handleConvert}
        onCancel={() => !isConverting && setShowConvertModal(false)}
      />

      <ConfirmModal
        isVisible={showCancelCallModal}
        type="confirm"
        message="এই কাস্টমারকে বাতিল করা হবে — এটা আর ইনকমপ্লিট তালিকায় দেখাবে না (ডিলিট হবে না, পরে দরকার হলে রিওপেন করা যাবে)। নিশ্চিত?"
        onConfirm={handleConfirmCancelCall}
        onCancel={() => setShowCancelCallModal(false)}
      />

      {isConverting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-2xl">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            <span className="text-sm font-bold text-gray-800">
              Pending Order তৈরি হচ্ছে...
            </span>
          </div>
        </div>
      )}
    </>
  );
}