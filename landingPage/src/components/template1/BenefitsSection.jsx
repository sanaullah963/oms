"use client";

export default function BenefitsSection({ page }) {
  const productName = page?.productName || "";
  const price = page?.price ?? 0;
  // benefits.heading/description খালি থাকলে জেনেরিক/productName-ভিত্তিক ফলব্যাক —
  // benefits.items এখন icon+title+description সহ পুরো কার্ড, আগের মতো শুধু একলাইন
  // feature bullet নয় (এই আইটেমগুলো top-level `features` array থেকে আলাদা,
  // ওটা এখনো OfferSection-এর checklist-এর জন্য ব্যবহৃত হয়)
  const heading = page?.benefits?.heading || `🌿 কেন ${productName} বেছে নেবেন?`;
  const description = page?.benefits?.description || "";
  const items = page?.benefits?.items?.length ? page.benefits.items : [];

  return (
    <section className="relative overflow-hidden bg-white py-8" id="benefits">
      {/* Background */}
      {/* <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-green-200/30 blur-3xl"></div> */}
      {/* <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-red-200/30 blur-3xl"></div> */}

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mt-4 text-3xl font-extrabold leading-10 text-gray-900 md:text-4xl">
            {heading}
          </h2>

          {description && (
            <p className="mt-4 text-base text-left leading-7 text-gray-600">
              {description}
            </p>
          )}
        </div>

        {/* Layout */}
        <div className="mt-12 grid items-center gap-2 lg:gap-6 lg:grid-cols-3">
          {items.map((b, i) => (
            <div
              key={i}
              className="rounded-md border border-green-300 bg-green-100 p-2 ps-4 shadow-xl"
            >
              <div className="mb-3 flex items-center justify-start gap-2 text-2xl">
                <span>{b.icon || "🌿"}</span>
                <h3 className="text-xl font-bold">{b.title}</h3>
              </div>
              {b.description && (
                <p className="text-sm text-gray-700">{b.description}</p>
              )}
            </div>
          ))}
          {/* price segment */}
          {/* <div className="rounded-xl border-2 border-green-500 bg-gradient-to-r from-green-200 to-blue-300 p-6 text-center shadow-lg">
            <p className="text-lg font-medium text-gray-700">বিশেষ অফার মূল্য</p>

            <h2 className="mt-2 text-4xl font-extrabold text-green-700">
              {productName}
            </h2>

            <div className="mt-5 inline-block rounded-full bg-red-600 px-6 py-3 shadow-md">
              <span className="ml-2 text-xl font-extrabold text-yellow-300">
                ৳{price}
              </span>
            </div>
          </div> */}

          <div className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-600 to-red-500 p-5 text-white shadow-2xl">
            <h3 className="text-2xl font-extrabold">আজই শুরু করুন</h3>
            <p className="mt-3 leading-7 text-white/90">
              আজই {productName} অর্ডার করে সুবিধাগুলো উপভোগ করুন।
            </p>
            <a
              href="#order"
              className="animate-soft-ripple mt-5 inline-flex rounded-2xl bg-white px-6 py-3 text-sm font-bold text-green-700 transition hover:scale-105"
            >
              🛒 এখনই অর্ডার করুন
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
