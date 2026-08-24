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
  FaTruck,
} from "react-icons/fa";
import DisplayTime from "@/components/common/DisplayTime";
import ConfirmModal from "@/components/common/ConfirmModal";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { useOrders } from "@/context/OrderContext";

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

export default function DraftOrderCard({ draft }) {
  const {
    deleteDraftOrder,
    updateDraftOrder,
    convertDraftOrder,
    setSearchQuery,
  } = useOrders();

  const page = draft?.landingPage || {};
  const productTypes = Array.isArray(page?.productTypes)
    ? page.productTypes
    : [];
  const hasProductTypes = productTypes.length > 0;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => getFormData(draft));
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50 via-white to-white px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ইনকমপ্লিট
                </span>
                {draft?.productName && (
                  <span className="max-w-[260px] truncate rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {draft.productName}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                <span>সর্বশেষ আপডেট</span>
                <DisplayTime
                  timeStamp={draft?.lastActivityAt || draft?.updatedAt}
                />
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <FaEdit size={12} /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5">
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    কাস্টমার
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold text-gray-800">
                    <FaUser className="text-gray-400" size={12} />
                    {draft?.name || "নাম দেওয়া হয়নি"}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    ফোন
                  </p>
                  {draft?.phone ? (
                    <button
                      type="button"
                      onClick={handleSearchThisNumber}
                      className="mt-1 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
                    >
                      <FaPhoneAlt size={12} />
                      {draft.phone}
                    </button>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">নম্বর নেই</p>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  ঠিকানা
                </p>
                <p className="mt-1 flex gap-2 text-sm leading-6 text-gray-700">
                  <FaMapMarkerAlt
                    className="mt-1 shrink-0 text-gray-400"
                    size={12}
                  />
                  <span>{draft?.address || "ঠিকানা দেওয়া হয়নি"}</span>
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                  পরিমাণ: {draft?.quantity || 1}টি
                </span>
                {draft?.productTypeLabel && (
                  <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    {draft.productTypeLabel}
                  </span>
                )}
                {draft?.deliveryArea === "outside" && (
                  <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                    ঢাকার বাইরে
                  </span>
                )}
                {hasProductTypes && !draft?.productTypeId && (
                  <span className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                    প্যাকেজ নির্বাচন বাকি
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/70 p-3 sm:flex-row">
            {phone && (
              <>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700"
                >
                  <FaPhoneAlt size={12} /> কল করুন
                </a>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                >
                  <FaCopy size={12} /> কপি
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-2.5 text-sm font-bold text-white shadow-sm hover:from-indigo-700 hover:to-blue-700"
            >
              Pending-এ পাঠান <FaArrowRight size={12} />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-red-600 ring-1 ring-red-100 hover:bg-red-50"
              aria-label="ড্রাফট ডিলিট করুন"
              title="ড্রাফট ডিলিট করুন"
            >
              <FaTrash size={13} />
            </button>
          </div>
        )}

        {error && !isEditing && (
          <div className="mx-3 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </article>

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
