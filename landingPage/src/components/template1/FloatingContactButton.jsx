// "use client";

// import { useEffect, useRef, useState } from "react";
// import { IconWhatsapp, IconPhone, IconChat, IconPlus } from "@/components/anardanaV2/Icons";
// import { GrContact } from "react-icons/gr";
// const OPTION_BASE =
//   "flex items-center gap-2.5 bg-sig-cream rounded-full py-2.5 pr-[18px] pl-2.5 shadow-[0_10px_24px_-6px_rgba(42,27,46,0.3)] transition-[opacity,transform] duration-[250ms] ease-out text-[13.5px] font-semibold text-sig-charcoal no-underline";
// const OPTION_HIDDEN = "opacity-0 translate-y-2.5 scale-90 pointer-events-none";
// const OPTION_VISIBLE = "opacity-100 translate-y-0 scale-100 pointer-events-auto";
// const OPTION_ICON_BASE = "w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0";

// export default function FloatingContactButton({ whatsappNumber, callNumber, imoNumber }) {
//   const [open, setOpen] = useState(false);
//   const rootRef = useRef(null);

//   useEffect(() => {
//     function handleOutside(e) {
//       if (rootRef.current && !rootRef.current.contains(e.target)) {
//         setOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", handleOutside);
//     document.addEventListener("touchstart", handleOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleOutside);
//       document.removeEventListener("touchstart", handleOutside);
//     };
//   }, []);

//   const waLink = `https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}`;
//   const optionClass = open ? `${OPTION_BASE} ${OPTION_VISIBLE}` : `${OPTION_BASE} ${OPTION_HIDDEN}`;

//   return (
//     <div className="fixed right-5 bottom-24 bg-amber-700 z-[150] flex flex-col-reverse items-end gap-3" ref={rootRef}>
//       <button
//         type="button"
//         className={`w-[50px] h-[50px] rounded-full bg-green-700  text-white border border-sig-white flex items-center justify-center shadow-[0_12px_30px_-8px_rgba(42,27,46,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
//           open ? "" : "animate-bounce "
//         }`}
//         onClick={() => setOpen((o) => !o)}
//         aria-expanded={open}
//         aria-label="যোগাযোগের অপশন দেখুন"
//       >
//         <GrContact />
//       </button>

//       <a href={waLink} target="_blank" rel="noopener noreferrer" className={optionClass}>
//         <span className={`${OPTION_ICON_BASE} bg-[#25d366] text-[#06280f]`}>
//           <IconWhatsapp width={16} height={16} />
//         </span>
//         WhatsApp
//       </a>

//       <a href={`tel:${callNumber}`} className={optionClass}>
//         <span className={`${OPTION_ICON_BASE} bg-sig-gold text-sig-plum-deep`}>
//           <IconPhone width={16} height={16} />
//         </span>
//         Call
//       </a>

//       {imoNumber && (
//         <a href={`imo://chat?phone=${imoNumber}`} className={optionClass}>
//           <span className={`${OPTION_ICON_BASE} bg-[#7b2fbe] text-sig-cream`}>
//             <IconChat width={16} height={16} />
//           </span>
//           IMO
//         </a>
//       )}
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { GrContact } from "react-icons/gr";
import {
  IconWhatsapp,
  IconPhone,
  IconChat,
  IconPlus,
} from "@/components/template1/Icons";

const OPTION_BASE =
  "flex items-center gap-2.5 bg-green-200 rounded-md py-1 px-2  pl-2shadow-[0_10px_24px_-6px_rgba(42,27,46,0.3)] text-[13.5px] font-semibold text-sig-charcoal no-underline transition-all duration-300 ease-out";

const OPTION_ICON_BASE =
  "w-[34px] h-[34px] rounded-md flex items-center justify-center shrink-0";

export default function FloatingContactButton({
  whatsappNumber,
  callNumber,
  imoNumber,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const waLink = whatsappNumber
    ? `https://wa.me/${String(whatsappNumber).replace(/[^\d]/g, "")}`
    : "";

  return (
    <div
      ref={rootRef}
      className="fixed bottom-30 right-8 z-50 w-[50px] h-[50px]"
    >
      {/* Contact Options */}
      <div
        className={`absolute bottom-[60px] right-0 flex flex-col items-end gap-1 transition-all duration-300 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        {/* WhatsApp — নম্বর খালি থাকলে ভাঙা wa.me/ লিংক তৈরি না করে পুরো অপশনটাই হাইড */}
        {whatsappNumber && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={OPTION_BASE}
          >
            WhatsApp
            <span className={`${OPTION_ICON_BASE} bg-[#25D366] text-white`}>
              <IconWhatsapp width={16} height={16} />
            </span>
          </a>
        )}

        {/* Call */}
        {callNumber && (
          <a href={`tel:${callNumber}`} className={OPTION_BASE}>
            Call
            <span
              className={`${OPTION_ICON_BASE} bg-sig-gold text-sig-plum-deep`}
            >
              <IconPhone width={16} height={16} />
            </span>
          </a>
        )}

        {/* IMO */}
        {imoNumber && (
          <a href={`imo://chat?phone=${imoNumber}`} className={OPTION_BASE}>
            IMO
            <span className={`${OPTION_ICON_BASE} bg-[#7B2FBE] text-white`}>
              <IconChat width={16} height={16} />
            </span>
          </a>
        )}
      </div>

      {/* Floating Button */}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="যোগাযোগের অপশন দেখুন"
        className={`absolute inset-0 flex items-center justify-center rounded-full bg-green-700 text-white border border-white shadow-[0_12px_30px_-8px_rgba(42,27,46,0.5)] transition-all duration-300 ${
          open ? "rotate-45" : "animate-soft-ripple"
        }`}
      >
        <GrContact width={24} height={24} />
      </button>
    </div>
  );
}
