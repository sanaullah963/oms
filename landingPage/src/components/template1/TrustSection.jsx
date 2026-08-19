"use client";
import Image from "next/image";
import ImageCarousel from "./ImageCarousel";

const FALLBACK_IMAGE = "/placeholder/p1.jpg";

// একটা সিম্পল single-image display (carousel না — trustImage/reviewImage দুটোই একটা করে ছবি)
// function SingleImage({ src, alt, imageClassName }) {
//   return (
//     <div className="relative mx-auto w-full max-w-md">
//       <Image
//         src={src}
//         alt={alt}
//         width={500}
//         height={500}
//         sizes="(min-width: 1024px) 40vw, 90vw"
//         className={`mx-auto h-auto w-full max-w-full ${imageClassName}`}
//       />
//     </div>
//   );
// }

export default function TrustSection({ page }) {
  const productName = page?.productName || "";
  // trustImage এবং reviewImage সম্পূর্ণ আলাদা দুটি field — একটা আরেকটার
  // fallback হিসেবে ব্যবহার করা হয় না, শুধু placeholder-এ fallback করে যদি একদমই খালি থাকে
  // const trustImage = page?.trustImage || FALLBACK_IMAGE;
  // const reviewImage = page?.reviewImage || FALLBACK_IMAGE;
  const reviewImages = page?.reviewImages?.length
    ? page.reviewImages
    : FALLBACK_IMAGE;
// console.log(page);
  return (
    <section
      id="reviews-image"
      className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 py-16 text-white"
    >
      {/* Background Blur */}
      {/* <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-green-500/20 blur-3xl"></div> */}
      {/* <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-red-500/20 blur-3xl"></div> */}
      <div className="relative mx-auto max-w-3xl px-4">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-xl">
            ⭐ Trusted Product
          </span>

          <h2 className="mt-5 text-3xl font-extrabold leading-tight md:text-5xl">
            কেন হাজারো মানুষ
            <br />
            <span className="text-green-400">
              {productName}-এর উপর আস্থা রাখেন?
            </span>
          </h2>

          <p className="mt-5 text-base leading-7 text-gray-300">
            মানসম্পন্ন উপাদান, সহজ ব্যবহার এবং গ্রাহকদের ইতিবাচক অভিজ্ঞতার কারণে{" "}
            {productName} সবাই ব্যাবহার করছে।
          </p>
        </div>

        {/* Trust visual */}
        <div className="relative mt-14">
          <ImageCarousel
            images={reviewImages}
            alt={productName}
            width={650}
            height={650}
            imageClassName="rounded-lg shadow-2xl"
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
