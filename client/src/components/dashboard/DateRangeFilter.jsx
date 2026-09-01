// "use client";
// import { useState } from "react";

// const PRESETS = [
//   { key: "today", label: "আজ" },
//   { key: "yesterday", label: "গতকাল" },
//   { key: "7d", label: "৭ দিন" },
//   { key: "30d", label: "৩০ দিন" },
//   { key: "1y", label: "১ বছর" },
// ];

// export default function DateRangeFilter({
//   preset,
//   onPresetChange,
//   customRange,
//   onCustomRangeChange,
//   onSingleDateChange,
// }) {
//   const [showCustom, setShowCustom] = useState(false);
//   const [showSingleDate, setShowSingleDate] = useState(false);
//   const [fromInput, setFromInput] = useState(customRange?.from || "");
//   const [toInput, setToInput] = useState(customRange?.to || "");
//   const [singleDateInput, setSingleDateInput] = useState("");

//   const handleApplyCustom = () => {
//     if (!fromInput || !toInput) return;
//     onCustomRangeChange({ from: fromInput, to: toInput });
//     setShowCustom(false);
//   };

//   const handleApplySingleDate = () => {
//     if (!singleDateInput) return;
//     onSingleDateChange(singleDateInput);
//     setShowSingleDate(false);
//   };

//   return (
//     <div className="flex items-center gap-2 flex-wrap">
//       {PRESETS.map((p) => (
//         <button
//           key={p.key}
//           onClick={() => {
//             onPresetChange(p.key);
//             setShowCustom(false);
//             setShowSingleDate(false);
//           }}
//           className={`px-3 py-1.5 text-sm rounded-md font-medium transition cursor-pointer ${
//             preset === p.key
//               ? "bg-indigo-600 text-white"
//               : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
//           }`}
//         >
//           {p.label}
//         </button>
//       ))}

//       {/* --- নির্দিষ্ট একটা তারিখ --- */}
//       <div className="relative">
//         <button
//           onClick={() => {
//             setShowSingleDate((v) => !v);
//             setShowCustom(false);
//           }}
//           className={`px-3 py-1.5 text-sm rounded-md font-medium transition cursor-pointer ${
//             preset === "singleDate"
//               ? "bg-indigo-600 text-white"
//               : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
//           }`}
//         >
//           🗓️ নির্দিষ্ট তারিখ
//         </button>

//         {showSingleDate && (
//           <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 flex flex-col gap-2 w-56">
//             <label className="text-xs text-gray-500">তারিখ বেছে নিন</label>
//             <input
//               type="date"
//               value={singleDateInput}
//               onChange={(e) => setSingleDateInput(e.target.value)}
//               className="border rounded px-2 py-1 text-sm"
//             />
//             <button
//               onClick={handleApplySingleDate}
//               className="mt-1 bg-indigo-600 text-white text-sm rounded px-2 py-1.5 cursor-pointer hover:bg-indigo-700"
//             >
//               প্রয়োগ করুন
//             </button>
//           </div>
//         )}
//       </div>

//       {/* --- কাস্টম রেঞ্জ (দুইটা তারিখ) --- */}
//       <div className="relative">
//         <button
//           onClick={() => {
//             setShowCustom((v) => !v);
//             setShowSingleDate(false);
//           }}
//           className={`px-3 py-1.5 text-sm rounded-md font-medium transition cursor-pointer ${
//             preset === "custom"
//               ? "bg-indigo-600 text-white"
//               : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
//           }`}
//         >
//           📅 কাস্টম তারিখ
//         </button>

//         {showCustom && (
//           <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 flex flex-col gap-2 w-56">
//             <label className="text-xs text-gray-500">শুরুর তারিখ</label>
//             <input
//               type="date"
//               value={fromInput}
//               onChange={(e) => setFromInput(e.target.value)}
//               className="border rounded px-2 py-1 text-sm"
//             />
//             <label className="text-xs text-gray-500">শেষ তারিখ</label>
//             <input
//               type="date"
//               value={toInput}
//               onChange={(e) => setToInput(e.target.value)}
//               className="border rounded px-2 py-1 text-sm"
//             />
//             <button
//               onClick={handleApplyCustom}
//               className="mt-1 bg-indigo-600 text-white text-sm rounded px-2 py-1.5 cursor-pointer hover:bg-indigo-700"
//             >
//               প্রয়োগ করুন
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



















"use client";
import { useState } from "react";

const PRESETS = [
  { key: "today", label: "আজ" },
  { key: "yesterday", label: "গতকাল" },
  { key: "3d", label: "৩ দিন" },
  { key: "7d", label: "৭ দিন" },
  { key: "30d", label: "৩০ দিন" },
  { key: "1y", label: "১ বছর" },
];

export default function DateRangeFilter({
  preset,
  onPresetChange,
  customRange,
  onCustomRangeChange,
  onSingleDateChange,
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [showSingleDate, setShowSingleDate] = useState(false);
  const [fromInput, setFromInput] = useState(customRange?.from || "");
  const [toInput, setToInput] = useState(customRange?.to || "");
  const [singleDateInput, setSingleDateInput] = useState("");

  const handleApplyCustom = () => {
    if (!fromInput || !toInput) return;
    onCustomRangeChange({ from: fromInput, to: toInput });
    setShowCustom(false);
  };

  const handleApplySingleDate = () => {
    if (!singleDateInput) return;
    onSingleDateChange(singleDateInput);
    setShowSingleDate(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => {
            onPresetChange(p.key);
            setShowCustom(false);
            setShowSingleDate(false);
          }}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition cursor-pointer ${
            preset === p.key
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* --- নির্দিষ্ট একটা তারিখ --- */}
      <div className="relative">
        <button
          onClick={() => {
            setShowSingleDate((v) => !v);
            setShowCustom(false);
          }}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition cursor-pointer ${
            preset === "singleDate"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          🗓️ নির্দিষ্ট তারিখ
        </button>

        {showSingleDate && (
          <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 flex flex-col gap-2 w-56">
            <label className="text-xs text-gray-500">তারিখ বেছে নিন</label>
            <input
              type="date"
              value={singleDateInput}
              onChange={(e) => setSingleDateInput(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={handleApplySingleDate}
              className="mt-1 bg-indigo-600 text-white text-sm rounded px-2 py-1.5 cursor-pointer hover:bg-indigo-700"
            >
              প্রয়োগ করুন
            </button>
          </div>
        )}
      </div>

      {/* --- কাস্টম রেঞ্জ (দুইটা তারিখ) --- */}
      <div className="relative">
        <button
          onClick={() => {
            setShowCustom((v) => !v);
            setShowSingleDate(false);
          }}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition cursor-pointer ${
            preset === "custom"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          📅 কাস্টম তারিখ
        </button>

        {showCustom && (
          <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 flex flex-col gap-2 w-56">
            <label className="text-xs text-gray-500">শুরুর তারিখ</label>
            <input
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <label className="text-xs text-gray-500">শেষ তারিখ</label>
            <input
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={handleApplyCustom}
              className="mt-1 bg-indigo-600 text-white text-sm rounded px-2 py-1.5 cursor-pointer hover:bg-indigo-700"
            >
              প্রয়োগ করুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
}