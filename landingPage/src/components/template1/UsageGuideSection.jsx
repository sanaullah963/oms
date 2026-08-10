"use client";

export default function UsageGuideSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white py-16">
      {/* Background */}
      {/* <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-green-200/20 blur-[120px]" /> */}
      {/* <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-red-200/20 blur-[120px]" /> */}

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
            🌿 ব্যবহার নির্দেশিকা
          </span>

          <h2 className="mt-5 text-3xl font-extrabold text-gray-900 md:text-5xl">
            কীভাবে ব্যবহার করবেন?
          </h2>

          <p className="mt-5 text-base leading-7 text-gray-600">
            সঠিক নিয়মে ব্যবহার করলে এটি আপনার দৈনন্দিন খাদ্যাভ্যাসের একটি অংশ
            হতে পারে।
          </p>
        </div>
      </div>
    </section>
  );
}
