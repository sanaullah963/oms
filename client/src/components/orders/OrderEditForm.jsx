import React from "react";

function OrderEditForm({
  formData,
  touchedPhones,
  loading,
  onFormChange,
  onPhoneChange,
  onPhoneFocus,
  onAddPhone,
  onDeletePhone,
  onSave,
  onCancel,
}) {
  return (
    <div className="space-y-1.5">
      {/* ফর্ম হেডার সেকশন */}
      <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="cursor-pointer px-4 py-2 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          disabled={loading}
        >
          Exit
        </button>
        <button
          onClick={onSave}
          className={`cursor-pointer px-4 py-2 text-sm rounded-lg text-white font-semibold transition ${
            loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          disabled={loading}
        >
          {loading ? "Saveing..." : "Save"}
        </button>
      </div>

      {/* Raw Input Text */}
      <label htmlFor="rawInputText" className="text-sm">
        Raw Text
      </label>
      <textarea
        name="rawInputText"
        value={formData.rawInputText}
        onChange={onFormChange}
        placeholder="RAW ইনপুট টেক্সট (ঐচ্ছিক)"
        rows="4"
        className=" w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
        disabled={loading}
      />

      {/* কাস্টমার নাম */}
      <label htmlFor="name" className="text-sm">
        Name
      </label>
      <input
        type="text"
        name="castomerName"
        value={formData.castomerName}
        onChange={onFormChange}
        placeholder="কাস্টমার নাম"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loading}
      />

      {/* permanent note */}
      <label htmlFor="permanentNote" className="text-sm">
        Permanent Note
      </label>
      <input
        type="text"
        name="permanentNote"
        value={formData.permanentNote}
        onChange={onFormChange}
        placeholder="permanent Note"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loading}
      />

      {/* phone number edit section */}
      <label className="text-sm">Phone</label>
      {formData.castomerPhone.map((phone, index) => {
        const isTouched = touchedPhones[index];
        const isValid = /^\d{11}$/.test(phone);
        return (
          <div key={index} className="mb-2">
            <div className="flex gap-2 mb-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => onPhoneChange(index, e.target.value)}
                onFocus={() => onPhoneFocus(index)}
                placeholder={`Phone ${index + 1}`}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                  ${
                    isTouched
                      ? isValid
                        ? "border-green-500"
                        : "border-red-500"
                      : "border-gray-300"
                  }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => onDeletePhone(index)}
                className="px-2 py-1 bg-red-500 text-white rounded"
                disabled={loading}
              >
                Delete
              </button>
            </div>
            {isTouched && (
              <p className={`text-xs mt-1 ${isValid ? "text-green-600" : "text-red-500"}`}>
                {isValid ? "✓ Valid number" : "Phone must be 11 digits"}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAddPhone}
          className="mt-1 p-2 bg-green-600 text-white rounded text-sm"
        >
          + Add Number
        </button>
      </div>

      {/* COD */}
      <label htmlFor="totalCOD" className="text-sm">
        COD
      </label>
      <input
        type="number"
        name="totalCOD"
        value={formData.totalCOD}
        onChange={onFormChange}
        placeholder="COD টাকা"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loading}
      />

      {/* Product Code */}
      <label htmlFor="productCode" className="text-sm">
        Product Code
      </label>
      <input
        type="text"
        name="productCode"
        value={formData.productCode}
        onChange={onFormChange}
        placeholder="পণ্য কোড (SKU)"
        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loading}
      />
    </div>
  );
}

export default OrderEditForm;
