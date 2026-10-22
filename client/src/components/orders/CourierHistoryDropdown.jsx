// "use client";
// import React, { useEffect, useRef, useState } from "react";

// const DEFAULT_PROVIDER_LABEL = "BD Courier";

// function getProviders(courierHistory) {
//   if (
//     Array.isArray(courierHistory?.providers) &&
//     courierHistory.providers.length > 0
//   ) {
//     return courierHistory.providers;
//   }

//   const all = courierHistory?.all;

//   if (all && all.success !== undefined) {
//     return [
//       {
//         key: "bdcourier",
//         label: DEFAULT_PROVIDER_LABEL,
//         success: all.success,
//         cancel: all.cancel,
//       },
//     ];
//   }

//   return [];
// }

// const hasNum = (value) =>
//   value !== null &&
//   value !== undefined &&
//   value !== "" &&
//   Number.isFinite(Number(value));

// function ProviderRow({ provider }) {
//   const meta = provider.meta || {};

//   const hasCounts =
//     hasNum(provider.success) && hasNum(provider.cancel);

//   const hasRatios =
//     hasNum(meta.deliveryRatio) ||
//     hasNum(meta.cancellationRatio);

//   let successPart = null;
//   let cancelPart = null;
//   let figure = null;

//   const notes = [];

//   if (hasCounts) {
//     const success = Number(provider.success);
//     const cancel = Number(provider.cancel);
//     const total = success + cancel;

//     if (total > 0) {
//       successPart = (success / total) * 100;
//       cancelPart = (cancel / total) * 100;
//     }

//     figure = (
//       <>
//         <span className="text-green-700">{success}</span>
//         <span className="text-gray-400"> / </span>
//         <span className="text-red-600">{cancel}</span>
//       </>
//     );

//     notes.push(
//       total > 0
//         ? `সফল ${
//             hasNum(meta.deliveryRatio)
//               ? meta.deliveryRatio
//               : Math.round(successPart)
//           }% • মোট ${total}`
//         : "কোনো ডেটা নেই"
//     );
//   } else if (hasRatios) {
//     successPart = hasNum(meta.deliveryRatio)
//       ? Math.min(100, Math.max(0, Number(meta.deliveryRatio)))
//       : 0;

//     cancelPart = hasNum(meta.cancellationRatio)
//       ? Math.min(100, Math.max(0, Number(meta.cancellationRatio)))
//       : 0;

//     figure = (
//       <>
//         <span className="text-green-700">
//           {hasNum(meta.deliveryRatio)
//             ? `${meta.deliveryRatio}%`
//             : "—"}
//         </span>

//         <span className="text-gray-400"> / </span>

//         <span className="text-red-600">
//           {hasNum(meta.cancellationRatio)
//             ? `${meta.cancellationRatio}%`
//             : "—"}
//         </span>
//       </>
//     );
//   } else {
//     figure = <span className="text-gray-400">—</span>;
//     notes.push("কোনো ডেটা নেই (কোনো পার্সেল শেষ হয়নি)");
//   }

//   if (meta.volumeRange) {
//     notes.push(`ভলিউম ${meta.volumeRange}`);
//   }

//   const reports = hasNum(meta.totalReports)
//     ? Number(meta.totalReports)
//     : null;

//   const categories = Array.isArray(meta.fraudCategories)
//     ? meta.fraudCategories
//     : [];

//   return (
//     <div className="py-1.5 border-b border-gray-100 last:border-0">
//       <div className="flex items-center justify-between gap-3">
//         <span className="text-xs font-semibold text-gray-700">
//           {provider.label}
//         </span>

//         <span className="text-xs font-medium">
//           {figure}
//         </span>
//       </div>

//       {/* আগের কোডের মতো কমপ্যাক্ট success/cancel বার */}
//       <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
//         {successPart !== null && (
//           <>
//             <div
//               className="bg-green-500"
//               style={{ width: `${successPart}%` }}
//             />

//             <div
//               className="bg-red-500"
//               style={{ width: `${cancelPart}%` }}
//             />
//           </>
//         )}
//       </div>

//       {notes.length > 0 && (
//         <div className="mt-0.5 text-[10px] text-gray-500">
//           {notes.join(" • ")}
//         </div>
//       )}

//       {/* Fraud reports — অতিরিক্ত রঙিন কার্ড ছাড়া */}
//       {reports !== null && reports > 0 && (
//         <div className="mt-0.5 text-[10px] text-red-700">
//           ⚠ {reports}টা রিপোর্ট
//           {categories.length > 0
//             ? `: ${categories.join(", ")}`
//             : ""}
//         </div>
//       )}

//       {reports === 0 && (
//         <div className="mt-0.5 text-[10px] text-gray-500">
//           কোনো রিপোর্ট নেই
//         </div>
//       )}

//       {meta.doubtfulReports === true && (
//         <div className="mt-0.5 text-[10px] text-amber-700">
//           ⚠ সন্দেহজনক রিপোর্ট আছে
//         </div>
//       )}

//       {hasNum(meta.score) && (
//         <div className="mt-0.5 text-[10px] text-gray-600">
//           স্কোর {meta.score}
//           {meta.level ? ` (${meta.level})` : ""}
//         </div>
//       )}
//     </div>
//   );
// }

// export default function CourierHistoryDropdown({
//   courierHistory,
//   defaultOpen = false,
// }) {
//   const [open, setOpen] = useState(defaultOpen);
//   const wrapperRef = useRef(null);

//   // বাইরে ক্লিক বা Escape চাপলে বন্ধ
//   useEffect(() => {
//     if (!open) return;

//     const onPointerDown = (e) => {
//       if (
//         wrapperRef.current &&
//         !wrapperRef.current.contains(e.target)
//       ) {
//         setOpen(false);
//       }
//     };

//     const onKeyDown = (e) => {
//       if (e.key === "Escape") setOpen(false);
//     };

//     document.addEventListener("mousedown", onPointerDown);
//     document.addEventListener("touchstart", onPointerDown);
//     document.addEventListener("keydown", onKeyDown);

//     return () => {
//       document.removeEventListener("mousedown", onPointerDown);
//       document.removeEventListener("touchstart", onPointerDown);
//       document.removeEventListener("keydown", onKeyDown);
//     };
//   }, [open]);

//   const all = courierHistory?.all;

//   if (!all) return null;

//   const providers = getProviders(courierHistory);

//   return (
//     <div
//       ref={wrapperRef}
//       className="relative"
//       onClick={(e) => e.stopPropagation()}
//     >
//       <button
//         type="button"
//         onClick={() => setOpen((prev) => !prev)}
//         aria-haspopup="true"
//         aria-expanded={open}
//         title="ফ্রড/কুরিয়ার হিস্ট্রির বিস্তারিত"
//         className="inline-flex items-center gap-1 text-xs text-black font-medium bg-gray-200 hover:bg-gray-300 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
//       >
//         <span>All</span>

//         <span className="text-green-700">{all.success}</span>
//         <span>/</span>
//         <span className="text-red-600">{all.cancel}</span>

//         <svg
//           className={`h-3 w-3 text-gray-600 transition-transform duration-200 ${
//             open ? "rotate-180" : ""
//           }`}
//           viewBox="0 0 20 20"
//           fill="currentColor"
//           aria-hidden="true"
//         >
//           <path
//             fillRule="evenodd"
//             d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
//             clipRule="evenodd"
//           />
//         </svg>
//       </button>

//       {open && (
//         <div
//           role="menu"
//           className="absolute left-0 top-full z-30 mt-1 w-56 max-w-[80vw] rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
//         >
//           <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
//             ফ্রড হিস্ট্রি (সফল / বাতিল)
//           </p>

//           {providers.map((provider) => (
//             <ProviderRow
//               key={provider.key || provider.label}
//               provider={provider}
//             />
//           ))}

//           {/* একাধিক API হলে মোট হিসাব */}
//           {providers.length > 1 && (
//             <div className="mt-1 flex items-center justify-between rounded-md bg-gray-50 px-2 py-1">
//               <span className="text-xs font-bold text-gray-700">
//                 মোট
//               </span>

//               <span className="text-xs font-bold">
//                 <span className="text-green-700">
//                   {all.success}
//                 </span>

//                 <span className="text-gray-400"> / </span>

//                 <span className="text-red-600">
//                   {all.cancel}
//                 </span>
//               </span>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
















"use client";
import React, { useEffect, useRef, useState } from "react";

const DEFAULT_PROVIDER_LABEL = "BD Courier";

function getProviders(courierHistory) {
  if (
    Array.isArray(courierHistory?.providers) &&
    courierHistory.providers.length > 0
  ) {
    return courierHistory.providers;
  }

  const all = courierHistory?.all;

  if (all && all.success !== undefined) {
    return [
      {
        key: "bdcourier",
        label: DEFAULT_PROVIDER_LABEL,
        success: all.success,
        cancel: all.cancel,
      },
    ];
  }

  return [];
}

const hasNum = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value));

// API ব্যর্থ/কল-না-হওয়া সারির ছোট ট্যাগ (সার্ভার meta.error.state পাঠায় — utils/courierHistoryProviders.js)
const ERROR_STATE_TAG = {
  not_called: { text: "কল হয়নি", color: "text-amber-700" },
  no_response: { text: "রেসপন্স নেই", color: "text-red-600" },
  api_error: { text: "API error", color: "text-red-600" },
  bad_response: { text: "ভুল রেসপন্স", color: "text-red-600" },
  internal_error: { text: "সমস্যা", color: "text-red-600" },
};

function ProviderRow({ provider }) {
  const meta = provider.meta || {};

  // এই API থেকে হিস্ট্রি আনা যায়নি — সংখ্যার বদলে কারণ দেখাই, সারিটা লুকাই না
  if (meta.error) {
    const tag = ERROR_STATE_TAG[meta.error.state] || ERROR_STATE_TAG.internal_error;
    return (
      <div className="py-1.5 border-b border-gray-100 last:border-0">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-gray-700">{provider.label}</span>
          <span className={`text-[11px] font-semibold ${tag.color}`}>
            ⚠ {tag.text}
            {meta.error.code ? ` ${meta.error.code}` : ""}
          </span>
        </div>
        <div className={`mt-0.5 text-[10px] break-words ${tag.color}`}>
          {meta.error.message || "হিস্ট্রি আনা যায়নি"}
        </div>
      </div>
    );
  }

  const hasCounts =
    hasNum(provider.success) && hasNum(provider.cancel);

  const hasRatios =
    hasNum(meta.deliveryRatio) ||
    hasNum(meta.cancellationRatio);

  let successPart = null;
  let cancelPart = null;
  let figure = null;

  const notes = [];

  if (hasCounts) {
    const success = Number(provider.success);
    const cancel = Number(provider.cancel);
    const total = success + cancel;

    if (total > 0) {
      successPart = (success / total) * 100;
      cancelPart = (cancel / total) * 100;
    }

    figure = (
      <>
        <span className="text-green-700">{success}</span>
        <span className="text-gray-400"> / </span>
        <span className="text-red-600">{cancel}</span>
      </>
    );

    notes.push(
      total > 0
        ? `সফল ${
            hasNum(meta.deliveryRatio)
              ? meta.deliveryRatio
              : Math.round(successPart)
          }% • মোট ${total}`
        : "কোনো ডেটা নেই"
    );
  } else if (hasRatios) {
    successPart = hasNum(meta.deliveryRatio)
      ? Math.min(100, Math.max(0, Number(meta.deliveryRatio)))
      : 0;

    cancelPart = hasNum(meta.cancellationRatio)
      ? Math.min(100, Math.max(0, Number(meta.cancellationRatio)))
      : 0;

    figure = (
      <>
        <span className="text-green-700">
          {hasNum(meta.deliveryRatio)
            ? `${meta.deliveryRatio}%`
            : "—"}
        </span>

        <span className="text-gray-400"> / </span>

        <span className="text-red-600">
          {hasNum(meta.cancellationRatio)
            ? `${meta.cancellationRatio}%`
            : "—"}
        </span>
      </>
    );
  } else {
    figure = <span className="text-gray-400">—</span>;
    notes.push("কোনো ডেটা নেই (কোনো পার্সেল শেষ হয়নি)");
  }

  if (meta.volumeRange) {
    notes.push(`ভলিউম ${meta.volumeRange}`);
  }

  const reports = hasNum(meta.totalReports)
    ? Number(meta.totalReports)
    : null;

  const categories = Array.isArray(meta.fraudCategories)
    ? meta.fraudCategories
    : [];

  return (
    <div className="py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-gray-700">
          {provider.label}
        </span>

        <span className="text-xs font-medium">
          {figure}
        </span>
      </div>

      {/* আগের কোডের মতো কমপ্যাক্ট success/cancel বার */}
      <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        {successPart !== null && (
          <>
            <div
              className="bg-green-500"
              style={{ width: `${successPart}%` }}
            />

            <div
              className="bg-red-500"
              style={{ width: `${cancelPart}%` }}
            />
          </>
        )}
      </div>

      {notes.length > 0 && (
        <div className="mt-0.5 text-[10px] text-gray-500">
          {notes.join(" • ")}
        </div>
      )}

      {/* Fraud reports — অতিরিক্ত রঙিন কার্ড ছাড়া */}
      {reports !== null && reports > 0 && (
        <div className="mt-0.5 text-[10px] text-red-700">
          ⚠ {reports}টা রিপোর্ট
          {categories.length > 0
            ? `: ${categories.join(", ")}`
            : ""}
        </div>
      )}

      {reports === 0 && (
        <div className="mt-0.5 text-[10px] text-gray-500">
          কোনো রিপোর্ট নেই
        </div>
      )}

      {meta.doubtfulReports === true && (
        <div className="mt-0.5 text-[10px] text-amber-700">
          ⚠ সন্দেহজনক রিপোর্ট আছে
        </div>
      )}

      {hasNum(meta.score) && (
        <div className="mt-0.5 text-[10px] text-gray-600">
          স্কোর {meta.score}
          {meta.level ? ` (${meta.level})` : ""}
        </div>
      )}
    </div>
  );
}

// onRetry: দিলে ড্রপডাউনের হেডারে "Retry" বাটন আসে; retrying: তখন স্পিনার + ডিজেবল
export default function CourierHistoryDropdown({
  courierHistory,
  defaultOpen = false,
  onRetry,
  retrying = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const wrapperRef = useRef(null);

  // বাইরে ক্লিক বা Escape চাপলে বন্ধ
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const all = courierHistory?.all;

  if (!all) return null;

  const providers = getProviders(courierHistory);

  // BD Courier ফেল করলে সার্ভার success/cancel = null রাখে — তখন "All" পিলে সংখ্যার বদলে ⚠ দেখাই
  const allOk = hasNum(all.success) && hasNum(all.cancel);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        title="ফ্রড/কুরিয়ার হিস্ট্রির বিস্তারিত"
        className="inline-flex items-center gap-1 text-xs text-black font-medium bg-gray-200 hover:bg-gray-300 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
      >
        <span>All</span>

        {allOk ? (
          <>
            <span className="text-green-700">{all.success}</span>
            <span>/</span>
            <span className="text-red-600">{all.cancel}</span>
          </>
        ) : (
          <span className="text-red-600 font-semibold">⚠ error</span>
        )}

        <svg
          className={`h-3 w-3 text-gray-600 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 w-56 max-w-[80vw] rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              ফ্রড হিস্ট্রি (সফল / বাতিল)
            </p>

            {/* Retry — নম্বর এডিট/নতুন নম্বর যোগ হলে বা ফলাফল আবার যাচাই করতে */}
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry()}
                disabled={retrying}
                title="নতুন করে হিস্ট্রি আনুন"
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 10a6 6 0 11-1.76-4.24M16 4v4h-4" />
                </svg>
                {retrying ? "আনা হচ্ছে..." : "Retry"}
              </button>
            )}
          </div>

          {providers.map((provider) => (
            <ProviderRow
              key={provider.key || provider.label}
              provider={provider}
            />
          ))}

          {/* একাধিক API হলে মোট হিসাব */}
          {providers.length > 1 && allOk && (
            <div className="mt-1 flex items-center justify-between rounded-md bg-gray-50 px-2 py-1">
              <span className="text-xs font-bold text-gray-700">
                মোট
              </span>

              <span className="text-xs font-bold">
                <span className="text-green-700">
                  {all.success}
                </span>

                <span className="text-gray-400"> / </span>

                <span className="text-red-600">
                  {all.cancel}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}