import React from "react";

function ScheduleModal({ date, note, onDateChange, onNoteChange, onCancel, onSubmit }) {
  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-200 p-6 rounded-lg shadow-2xl w-full max-w-sm z-30">
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-full border p-2 mb-4 rounded"
      />
      <input
        type="text"
        placeholder="note (optional)"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        className="w-full border p-2 mb-4 rounded"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 cursor-pointer bg-gray-300 rounded hover:bg-gray-400"
        >
          বাতিল
        </button>
        <button
          onClick={onSubmit}
          className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-800"
        >
          সেভ করুন
        </button>
      </div>
    </div>
  );
}

export default ScheduleModal;
