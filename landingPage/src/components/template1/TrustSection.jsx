// "use client";
// import Image from "next/image";

// export default function TrustSection() {
//   return (
//     <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 py-16 text-white">
//       {/* Background Blur */}
//       <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-green-500/20 blur-3xl"></div>
//       <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-red-500/20 blur-3xl"></div>

//       <div className="relative mx-auto max-w-7xl px-4">
//         {/* Heading */}
//         <div className="mx-auto max-w-3xl text-center">
//           <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-xl">
//             ⭐ Trusted Herbal Formula
//           </span>

//           <h2 className="mt-5 text-3xl font-extrabold leading-tight md:text-5xl">
//             কেন হাজারো মানুষ
//             <br />
//             <span className="text-green-400">আনার দানার উপর আস্থা রাখেন?</span>
//           </h2>

//           <p className="mt-5 text-base leading-7 text-gray-300">
//             প্রাকৃতিক উপাদান, সহজ ব্যবহার এবং গ্রাহকদের ইতিবাচক অভিজ্ঞতার
//             কারণে আনার দানা অনেকের দৈনন্দিন খাদ্যাভ্যাসের একটি অংশ হয়ে উঠেছে।
//           </p>
//         </div>

//         {/* Image */}
//         <div className="relative mt-14">
//           <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 to-red-500 opacity-30 blur-3xl"></div>
//           <Image
//             src="/images/anardana.jpg"
//             width={500}
//             height={500}
//             alt="Anar Dana"
//             className="relative mx-auto rounded-[40px] shadow-[0_25px_80px_rgba(0,0,0,.45)]"
//           />
//         </div>

//         {/* CTA */}
//         <div className="mt-14 text-center">
//           <a
//             href="#order"
//             className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-500 to-red-500 px-8 py-4 text-lg font-bold text-white shadow-2xl transition hover:scale-105"
//           >
//             🛒 এখনই অর্ডার করুন
//           </a>
//         </div>
//       </div>
//     </section>
//   );
// }



"use client";
import ImageCarousel from "./ImageCarousel";

// Add / replace with your real product photos
const trustImages = [
  "/images/anardana.jpg",
  "/images/anardana-1.jpg",
  "/images/anardana-2.jpg",
  "/images/anardana-3.jpg",
  "/images/anardana-4.jpg",
];

export default function TrustSection() {
  return (
    <section id="reviews-image" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 py-16 text-white">
      {/* Background Blur */}
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-green-500/20 blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-red-500/20 blur-3xl"></div>
    {/* overflow */}
      <div className="relative mx-auto max-w-3xl px-4">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-xl">
            ⭐ Trusted Herbal Formula
          </span>

          <h2 className="mt-5 text-3xl font-extrabold leading-tight md:text-5xl">
            কেন হাজারো মানুষ
            <br />
            <span className="text-green-400">আনার দানার উপর আস্থা রাখেন?</span>
          </h2>

          <p className="mt-5 text-base leading-7 text-gray-300">
            প্রাকৃতিক উপাদান, সহজ ব্যবহার এবং গ্রাহকদের ইতিবাচক অভিজ্ঞতার
            কারণে আনার দানা সবাই ব্যাবহার করছে।
          </p>
        </div>

        {/* Image carousel */}
        <div className="relative mt-14">
          {/* <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 to-red-500 opacity-30 blur-3xl"></div> */}
          <ImageCarousel
            images={trustImages}
            alt="Anar Dana"
            width={500}
            height={500}
            imageClassName="rounded-[10px] shadow-[0_25px_80px_rgba(0,0,0,.45)]"
          />
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <a
            href="#order"
            className="animate-soft-ripple inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-500 to-red-500 px-8 py-4 text-lg font-bold text-white shadow-2xl transition hover:scale-105"
          >
            🛒 এখনই অর্ডার করুন
          </a>
        </div>
      </div>
    </section>
  );
}