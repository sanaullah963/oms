// "use client";
// import { useState, useEffect, useRef } from "react";
// import Image from "next/image";

// export default function ImageCarousel({
//   images,
//   alt,
//   imageClassName = "",
//   width = 650,
//   height = 650,
// }) {
//   const [index, setIndex] = useState(0);
//   const [brokenSrcs, setBrokenSrcs] = useState({});
//   // --- মেইন ছবি বদলানোর সময় লোডিং ওভারলে দেখানোর জন্য ---
//   const [isMainLoading, setIsMainLoading] = useState(true);
//   const loadedSrcs = useRef(new Set());

//   const activeSrc = images[index];

//   // --- Runtime speed fix: পেজ লোড হওয়ার সাথে সাথেই সব ছবি ব্যাকগ্রাউন্ডে
//   // ব্রাউজারের নেটিভ Image() দিয়ে preload করে রাখা হয় (browser HTTP cache-এ
//   // বসে যায়) — তাই থাম্বনেইলে ক্লিক করলে ব্রাউজার cache থেকেই দ্রুত দেখাতে পারে,
//   // নতুন করে নেটওয়ার্ক রাউন্ড-ট্রিপ লাগে না। ---
//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     images.forEach((src) => {
//       if (!src || loadedSrcs.current.has(src)) return;
//       const img = new window.Image();
//       img.src = src;
//       loadedSrcs.current.add(src);
//     });
//   }, [images]);

//   // --- index/activeSrc বদলালে লোডিং ওভারলে আবার চালু করা, যদি না এই ছবিটা
//   // আগেই ব্রাউজার cache-এ preload হয়ে থাকে (তখন সাথে সাথেই লোড হয়ে যাবে) ---
//   useEffect(() => {
//     setIsMainLoading(true);
//   }, [activeSrc]);

//   const openFullImage = () => {
//     window.open(activeSrc, "_blank", "noopener,noreferrer");
//   };

//   const markBroken = (src) => {
//     console.error(
//       `[ImageCarousel] failed to load: ${src} — check that this exact file exists under /public`,
//     );
//     setBrokenSrcs((prev) => ({ ...prev, [src]: true }));
//     setIsMainLoading(false);
//   };

//   return (
//     <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start">
//       {images.length > 1 && (
//         <div className="flex shrink-0 gap-2 overflow-x-auto pr-16 sm:w-20 sm:flex-col sm:overflow-x-visible sm:pr-0 ">
//           {images.map((img, i) => (
//             <button
//               key={i}
//               type="button"
//               onClick={() => setIndex(i)}
//               aria-label={`ছবি ${i + 1} দেখুন`}
//               className={`relative h-16 w-16 shrink-0  rounded-md  border-4 bg-white transition sm:h-20 sm:w-20 ${
//                 i === index
//                   ? "border-green-500"
//                   : "border-gray-200 hover:border-gray-300"
//               }`}
//             >
//               {brokenSrcs[img] ? (
//                 <span className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-400">
//                   no image
//                 </span>
//               ) : (
//                 <Image
//                   key={img}
//                   src={img}
//                   alt={`${alt} - থাম্বনেইল ${i + 1}`}
//                   fill
//                   unoptimized
//                   sizes="80px"
//                   className="object-cover rounded"
//                   onError={() => markBroken(img)}
//                 />
//               )}
//             </button>
//           ))}
//         </div>
//       )}

//       {/* Main image — click to open full size in a new tab */}
//       <button
//         type="button"
//         onClick={openFullImage}
//         aria-label="বড় সাইজে ছবিটি দেখুন"
//         className="relative flex min-w-0 flex-1 cursor-zoom-in items-center justify-center"
//       >
//         {brokenSrcs[activeSrc] ? (
//           <div
//             className={`mx-auto flex items-center justify-center bg-gray-100 text-sm text-gray-400 ${imageClassName}`}
//             style={{ width, height: height / 2 }}
//           >
//             ছবি লোড হয়নি: {activeSrc}
//           </div>
//         ) : (
//           <>
//             {/* --- লোডিং ওভারলে: ওপর থেকে নিচের দিকে শ্যাডো সুইপ + স্পিনার,
//             যতক্ষণ না নতুন সিলেক্ট করা ছবিটা লোড হয় --- */}
//             {isMainLoading && (
//               <div
//                 className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-md bg-gray-100"
//                 style={{ minHeight: height / 2 }}
//               >
//                 <div className="carousel-shimmer-sweep absolute inset-0" />
//                 <svg
//                   className="relative h-8 w-8 animate-spin text-gray-400"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                 >
//                   <circle
//                     className="opacity-25"
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                   />
//                   <path
//                     className="opacity-90"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
//                   />
//                 </svg>
//               </div>
//             )}
//             <Image
//               key={activeSrc}
//               src={activeSrc}
//               alt={alt}
//               width={width}
//               height={height}
//               unoptimized
//               sizes="(min-width: 1024px) 50vw, 100vw"
//               className={`mx-auto h-auto max-h-[80vh] w-auto max-w-full object-contain transition-opacity duration-200 ${
//                 isMainLoading ? "opacity-0" : "opacity-100"
//               } ${imageClassName}`}
//               priority
//               onLoad={() => setIsMainLoading(false)}
//               onError={() => markBroken(activeSrc)}
//             />
//           </>
//         )}
//       </button>

//       <style jsx>{`
//         .carousel-shimmer-sweep {
//           background: linear-gradient(
//             to bottom,
//             transparent 0%,
//             rgba(0, 0, 0, 0.06) 45%,
//             rgba(0, 0, 0, 0.12) 50%,
//             rgba(0, 0, 0, 0.06) 55%,
//             transparent 100%
//           );
//           background-size: 100% 200%;
//           animation: carousel-shadow-sweep 1.1s ease-in-out infinite;
//         }
//         @keyframes carousel-shadow-sweep {
//           0% {
//             background-position: 0 -100%;
//           }
//           100% {
//             background-position: 0 200%;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }











"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

export default function ImageCarousel({
  images,
  alt,
  imageClassName = "",
  width = 650,
  height = 650,
}) {
  const [index, setIndex] = useState(0);
  const [brokenSrcs, setBrokenSrcs] = useState({});
  const [isMainLoading, setIsMainLoading] = useState(true);
  const loadedSrcs = useRef(new Set());

  const activeSrc = images[index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    images.forEach((src) => {
      if (!src || loadedSrcs.current.has(src)) return;
      const img = new window.Image();
      img.src = src;
      loadedSrcs.current.add(src);
    });
  }, [images]);

  useEffect(() => {
    setIsMainLoading(true);
  }, [activeSrc]);

  const openFullImage = () => {
    window.open(activeSrc, "_blank", "noopener,noreferrer");
  };

  const markBroken = (src) => {
    console.error(
      `[ImageCarousel] failed to load: ${src} — check that this exact file exists under /public`,
    );
    setBrokenSrcs((prev) => ({ ...prev, [src]: true }));
    setIsMainLoading(false);
  };

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start">
      {images.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto pr-16 sm:w-20 sm:flex-col sm:overflow-x-visible sm:pr-0 ">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`ছবি ${i + 1} দেখুন`}
              className={`relative h-16 w-16 shrink-0  rounded-md  border-4 bg-white transition sm:h-20 sm:w-20 ${
                i === index
                  ? "border-green-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {brokenSrcs[img] ? (
                <span className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-400">
                  no image
                </span>
              ) : (
                <Image
                  key={img}
                  src={img}
                  alt={`${alt} - থাম্বনেইল ${i + 1}`}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-cover rounded"
                  onError={() => markBroken(img)}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={openFullImage}
        aria-label="বড় সাইজে ছবিটি দেখুন"
        className="relative flex min-w-0 flex-1 cursor-zoom-in items-center justify-center"
      >
        {brokenSrcs[activeSrc] ? (
          <div
            className={`mx-auto flex items-center justify-center bg-gray-100 text-sm text-gray-400 ${imageClassName}`}
            style={{ width, height: height / 2 }}
          >
            ছবি লোড হয়নি: {activeSrc}
          </div>
        ) : (
          <>
            {isMainLoading && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-md bg-gray-100"
                style={{ minHeight: height / 2 }}
              >
                <div className="carousel-shimmer-sweep absolute inset-0" />
                <svg
                  className="relative h-8 w-8 animate-spin text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              </div>
            )}
            <Image
              key={activeSrc}
              src={activeSrc}
              alt={alt}
              width={width}
              height={height}
              unoptimized
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`mx-auto h-auto max-h-[80vh] w-auto max-w-full object-contain transition-opacity duration-200 ${
                isMainLoading ? "opacity-0" : "opacity-100"
              } ${imageClassName}`}
              priority
              onLoad={() => setIsMainLoading(false)}
              onError={() => markBroken(activeSrc)}
            />
          </>
        )}
      </button>
    </div>
  );
}