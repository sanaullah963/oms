// "use client";
// import { FaStar, FaLeaf, FaPhoneAlt, FaArrowDown, FaShoppingCart } from "react-icons/fa";
// import Link from "next/link";
// import ImageCarousel from "./ImageCarousel";

// const heroImages = [
//   "/images/anardana.jpg",
//   "/images/anardana-1.jpg",
//   "/images/anardana-2.jpg",
//   "/images/anardana-3.jpg",
//   "/images/anardana-4.jpg",
// ];

// export default function HeroTop() {
//   return (
//     <section className="relative overflow-hidden bg-gradient-to-b from-red-50 via-white to-green-50">
//       {/* Background */}
//       <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-green-300/30 blur-3xl" />
//       <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-red-300/30 blur-3xl" />

//       {/* Announcement */}
//       <div className="bg-gradient-to-r from-red-600 to-red-500 text-white">
//         <div className="mx-auto max-w-7xl px-3 py-1.5 text-center text-xs font-bold sm:text-sm">
//           🔥 আজ অর্ডার করলে বিশেষ ডিসকাউন্ট + Cash On Delivery
//         </div>
//       </div>

//       <div className="relative mx-auto max-w-7xl px-3 py-2 sm:px-4">
//         {/* Rating */}
//         <div className="flex justify-center">
//           <div className="rounded-xl bg-yellow-200 px-4 py-1.5 shadow">
//             <div className="flex items-center gap-1.5">
//               <FaStar className="text-yellow-500" />
//               <FaStar className="text-yellow-500" />
//               <FaStar className="text-yellow-500" />
//               <FaStar className="text-yellow-500" />
//               <FaStar className="text-yellow-500" />
//               <span className="ml-1.5 text-sm font-bold sm:text-base">
//                 4.9 (১০,০০০+ Reviews)
//               </span>
//             </div>
//           </div>
//         </div>

//         <div className="relative mx-auto max-w-7xl px-1 py-8 sm:px-2">
//           <div className="grid items-center gap-10 lg:grid-cols-2">
//             {/* Left */}
//             <div>
//               <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3.5 py-1.5 text-sm font-semibold text-green-700">
//                 <FaLeaf />
//                 ১০০% ইউনানী হারবাল
//               </span>

//               <h1 className="mt-5 text-3xl font-extrabold leading-tight text-gray-900 md:text-5xl">
//                 প্রতিদিন
//                 <span className="text-green-600"> আনার দানা </span>
//                 খান,
//                 <br />
//                 শরীরকে রাখুন
//                 <span className="text-red-600"> সুস্থ ও শক্তিশালী</span>
//               </h1>

//               <p className="mt-5 text-base leading-7 text-gray-600">
//                 মুখের রুচি বৃদ্ধি করে, হজম শক্তি উন্নত করে, ওজন বাড়াতে
//                 সাহায্য করে, শরীরে শক্তি যোগায় এবং সার্বিক স্বাস্থ্য ভালো
//                 রাখতে সহায়ক।
//               </p>

//               {/* CTA */}
//               <div className="mt-4 flex flex-wrap gap-2">
//                 <a
//                   href="#order"
//                   className=" rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-green-700 sm:text-base"
//                 >
//                   এখনই অর্ডার করুন
//                 </a>

//                 <a
//                   href="#benefits"
//                   className="flex items-center gap-2 rounded-md border border-green-600 bg-green-100 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-50 sm:text-base"
//                 >
//                   বিস্তারিত দেখুন
//                 </a>
//               </div>

//               {/* Bottom */}
//               <div className="mt-8 flex items-center gap-3 rounded-xl bg-green-100 p-3.5">
//                 <div>
//                   <h4 className="text-base font-bold">সারা বাংলাদেশে হোম ডেলিভারি</h4>
//                   <p className="text-sm text-gray-600">ক্যাশ অন ডেলিভারি সুবিধা</p>
//                 </div>
//               </div>
//             </div>

//             {/* Right — carousel */}
//             <div className="relative">
//               {/* <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-300 to-red-300 opacity-30 blur-3xl"></div> */}
//               <div className="relative ">
//                 <ImageCarousel
//                   images={heroImages}
//                   alt="আনার দানা"
//                   width={650}
//                   height={650}
//                   imageClassName="rounded-lg shadow-2xl"
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Price */}
//         <div className="mt-8 text-center">
//           <p className="text-lg text-gray-400 line-through">৳১২০০</p>
//           <h2 className="text-5xl font-extrabold text-red-600">৳৮৯০</h2>
//         </div>

//         {/* CTA */}
//         <div className="mt-8 flex flex-col gap-3">
//           <Link
//             href="#order"
//             className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-600 to-red-500 py-4 text-lg font-bold text-white shadow-xl transition hover:scale-[1.02]"
//           >
//             <FaShoppingCart />
//             এখনই অর্ডার করুন
//           </Link>

//           <a
//             href="tel:+8801XXXXXXXXX"
//             className="flex items-center justify-center gap-3 rounded-2xl border-2 border-green-600 py-4 text-lg font-bold text-green-700"
//           >
//             <FaPhoneAlt />
//             ফোন করুন
//           </a>
//         </div>

//         {/* Scroll */}
//         <div className="mt-5 flex animate-bounce justify-center">
//           <FaArrowDown className="text-xl text-red-500" />
//         </div>
//       </div>
//     </section>
//   );
// }

"use client";
import {
  FaStar,
  FaLeaf,
  FaPhoneAlt,
  FaArrowDown,
  FaShoppingCart,
} from "react-icons/fa";
import Link from "next/link";
import ImageCarousel from "./ImageCarousel";

const heroImages = [
  "/images/anardana.jpg",
  "/images/anardana-1.jpg",
  "/images/anardana-2.jpg",
  "/images/anardana-3.jpg",
  "/images/anardana-4.jpg",
];

export default function HeroTop() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-red-50 via-white to-green-50">
      {/* Background */}
      {/* <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-green-300/30 blur-3xl" /> */}
      {/* <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-red-300/30 blur-3xl" /> */}

      {/* Announcement */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 text-white">
        <div className="mx-auto max-w-7xl px-3 py-1.5 text-center text-xl font-bold sm:text-sm">
          স্থায়ীভাবে ওজন বাড়বে মাত্র ১ মাস ঔষধ খেলেই
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-3 py-2 sm:px-4">
        {/* Rating */}
        <div className="flex justify-center">
          <div className="rounded-xl bg-yellow-200 px-4 py-1.5 shadow">
            <div className="flex items-center gap-1.5">
              <FaStar className="text-yellow-500" />
              <FaStar className="text-yellow-500" />
              <FaStar className="text-yellow-500" />
              <FaStar className="text-yellow-500" />
              <FaStar className="text-yellow-500" />
              <span className="ml-1.5 text-sm font-bold sm:text-base">
                4.9 (১০,০০০+ Reviews)
              </span>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-1 py-8 sm:px-2">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Left */}
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3.5 py-1.5 text-sm font-semibold text-green-700">
                <FaLeaf />
                ১০০% ইউনানী ঔষধ
              </span>

              <h1 className="mt-5 text-3xl font-extrabold leading-tight text-gray-900 md:text-5xl">
                স্থায়ীভাবে ওজন বাড়ানোর জন্য
                <span className="text-green-600"> আনার দানা </span>
                খান,
              </h1>

              <p className="mt-5 text-base leading-7 text-gray-600">
                মুখের রুচি বৃদ্ধি করে, হজম শক্তি উন্নত করে, ওজন বাড়াতে সাহায্য
                করে, শরীরে শক্তি যোগায় এবং সার্বিক স্বাস্থ্য ভালো রাখতে সহায়ক।
                স্থায়ীভাবে ওজন বাড়ায়।
              </p>

              {/* CTA */}
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="#order"
                  className="animate-soft-ripple rounded-md bg-green-600 px-4 py-2 text-lg font-bold text-white shadow-lg transition hover:scale-105 hover:bg-green-700 sm:text-base"
                >
                  এখনই অর্ডার করুন
                </a>

                <a
                  href="#benefits"
                  className="flex items-center gap-2 rounded-md border border-green-600 bg-green-100 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-50 sm:text-base"
                >
                  বিস্তারিত দেখুন
                </a>
              </div>

              

              {/* Bottom */}
              <div className="mt-8 flex items-center gap-3 rounded-xl bg-green-100 p-3.5">
                <div>
                  <h4 className="text-base font-bold">
                    একজনের ফুল কোর্স (২ কৌটা)
                  </h4>
                  <p className="text-sm text-gray-600">
                    একসাথে দাম মাত্র{" "}
                    <span className="mx-2  text-3xl font-extrabold text-red-600">
                      ৫৯০ টাকা
                    </span>
                     এক মাসের ঔষধ
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3 rounded-xl bg-green-100 p-3.5">
                <div>
                  <h4 className="text-base font-bold">
                    সারা বাংলাদেশে হোম ডেলিভারি
                  </h4>
                  <p className="text-sm text-gray-600">
                    ক্যাশ অন ডেলিভারি সুবিধা
                  </p>
                </div>
              </div>
            </div>

            {/* Right — carousel */}
            <div className="relative min-w-0">
              <div className="relative min-w-0">
                <ImageCarousel
                  images={heroImages}
                  alt="আনার দানা"
                  width={650}
                  height={650}
                  imageClassName="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mt-8 text-center">
          <div className=""></div>
          <div className=" flex items-center justify-center gap-3">
            <p className="text-lg inline-block text-gray-400 line-through">
              ৳৭২০
            </p>
            <h2 className="text-5xl  inline-block font-extrabold text-red-600">
              ৳৫৯০
            </h2>
          </div>
          <p className="text-md text-gray-700 mt-2">
            🚚 ডেলিভারি চার্জ সারাদেশে ফ্রী
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="#order"
            className=" flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-600 to-red-500 py-4 text-lg font-bold text-white shadow-xl transition hover:scale-[1.02]"
          >
            <FaShoppingCart />
            এখনই অর্ডার করুন
          </Link>

          <a
            href="tel:+8801XXXXXXXXX"
            className="flex items-center justify-center gap-3 rounded-2xl border-2 border-green-600 py-4 text-lg font-bold text-green-700"
          >
            <FaPhoneAlt />
            ফোন করুন
          </a>
        </div>

        {/* Scroll */}
        <div className="mt-5 flex animate-bounce justify-center">
          <FaArrowDown className="text-xl text-red-500" />
        </div>
      </div>
    </section>
  );
}

// overflow
