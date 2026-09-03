// export default function MismatchTable({ mismatches }) {
//   if (!mismatches || mismatches.length === 0) return null;

import { copyToClipboard } from "@/utils/copyToClipboard";

//   return (
//     <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
//       <h3 className="text-sm font-semibold text-gray-600 mb-3">⚠️ COD গরমিল পার্সেল</h3>
//       <div className="overflow-x-auto">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="text-left text-gray-500 border-b">
//               <th className="py-2 pr-3">নাম</th>
//               <th className="py-2 pr-3">ফোন</th>
//               <th className="py-2 pr-3">Tracking ID</th>
//               <th className="py-2 pr-3">আমাদের COD</th>
//               <th className="py-2 pr-3">কুরিয়ার COD</th>
//               <th className="py-2 pr-3">পার্থক্য</th>
//             </tr>
//           </thead>
//           <tbody>
//             {mismatches.map((m) => {
//               const deliveredAmount = m.courier?.deliveredCodAmount ?? 0;
//               const diff = deliveredAmount - (m.totalCOD || 0);
//               return (
//                 <tr key={m._id} className="border-b last:border-0">
//                   <td className="py-2 pr-3 font-medium">{m.castomerName}</td>
//                   <td className="py-2 pr-3 text-blue-600">
//                     {Array.isArray(m.castomerPhone) ? m.castomerPhone[0] : m.castomerPhone}
//                   </td>
//                   <td className="py-2 pr-3">{m.courier?.trackingId || "-"}</td>
//                   <td className="py-2 pr-3">৳{m.totalCOD}</td>
//                   <td className="py-2 pr-3">৳{m.courier?.deliveredCodAmount ?? "-"}</td>
//                   <td className={`py-2 pr-3 font-semibold ${diff < 0 ? "text-red-600" : "text-green-600"}`}>
//                     {diff > 0 ? "+" : ""}
//                     {diff}
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

export default function MismatchTable({ mismatches }) {
  if (!mismatches || mismatches.length === 0) return null;
  return (
    <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">
        {mismatches.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm font-medium">
            ⚠️ {mismatches.length}টি delivered পার্সেলে COD এমাউন্ট গরমিল
            পাওয়া গেছে —।
          </div>
        )}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-3">নাম</th>
              <th className="py-2 pr-3">ফোন</th>
              <th className="py-2 pr-3">যোগ করেছেন</th>
              <th className="py-2 pr-3">Tracking ID</th>
              <th className="py-2 pr-3">আমাদের COD</th>
              <th className="py-2 pr-3">কুরিয়ার COD</th>
              <th className="py-2 pr-3">পার্থক্য</th>
            </tr>
          </thead>
          <tbody>
            {mismatches.map((m) => {
              const deliveredAmount = m.courier?.deliveredCodAmount ?? 0;
              const diff = deliveredAmount - (m.totalCOD || 0);
              return (
                <tr key={m._id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{m.castomerName}</td>
                  <td
                    className="py-2 pr-3 text-blue-600 cursor-pointer"
                    onClick={() => copyToClipboard(m.castomerPhone[0])}
                  >
                    {Array.isArray(m.castomerPhone)
                      ? m.castomerPhone[0]
                      : m.castomerPhone}
                  </td>
                  <td className="py-2 pr-3 text-gray-500">
                    {m.createdByName || "-"}
                  </td>
                  <td
                    className="py-2 pr-3 text-blue-600 cursor-pointer"
                    onClick={() => copyToClipboard(m.courier?.trackingId)}
                  >
                    {m.courier?.trackingId || "-"}
                  </td>
                  <td className="py-2 pr-3">৳{m.totalCOD}</td>
                  <td className="py-2 pr-3">
                    ৳{m.courier?.deliveredCodAmount ?? "-"}
                  </td>
                  <td
                    className={`py-2 pr-3 font-semibold ${diff < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
