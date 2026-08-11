// "use client";

// export default function StickyMobileBar() {
//   return (
//     <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,.1)] lg:hidden">
//       <div className="flex items-center gap-2">
//         <div>
//           <h3 className="text-3xl font-extrabold text-green-600">৳৮৯০</h3>
//         </div>

//         <a
//           href="#order"
//           className="flex-1 rounded-md bg-gradient-to-r from-green-600 to-red-500 py-2 text-center text-lg font-bold text-white"
//         >
//           🛒 অর্ডার করুন
//         </a>
//       </div>
//     </div>
//   );
// }


"use client";

export default function StickyMobileBar({ isVisible }) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 border-t bg-white px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,.1)] transition-transform duration-300 lg:hidden ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-2">
        <div>
          <h3 className="text-3xl font-extrabold text-green-600">৳৮৯০</h3>
        </div>

        <a
          href="#order"
          className="flex-1 rounded-md bg-gradient-to-r from-green-600 to-red-500 py-2 text-center text-lg font-bold text-white"
        >
          🛒 অর্ডার করুন
        </a>
      </div>
    </div>
  );
}