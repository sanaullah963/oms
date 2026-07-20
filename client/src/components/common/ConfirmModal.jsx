"use client";
import ReactDOM from "react-dom";

const ConfirmModal = ({ isVisible, type, message, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  const isConfirm = type === "confirm";
  const title = isConfirm ? "নিশ্চিত করুন" : message.startsWith("ত্রুটি") ? "ত্রুটি!" : "সফল!";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 bg-gray-400 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 scale-100">
        <h3
          className={`text-lg font-bold mb-3 ${
            isConfirm || message.startsWith("ত্রুটি") ? "text-red-600" : "text-green-600"
          }`}
        >
          {title}
        </h3>
        <p className="text-gray-700 mb-6 text-sm">{message}</p>

        <div className="flex justify-end space-x-3">
          {isConfirm && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              না, ফিরে যান
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
              isConfirm ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isConfirm ? "হ্যাঁ, নিশ্চিত" : "ঠিক আছে"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmModal;
