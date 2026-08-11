"use client";

export default function UsageGuideSection() {
  return (
    <section id="use-process" className="relative overflow-hidden bg-gradient-to-b from-white via-green-400 to-white py-16">
      <div className="relative mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
            🌿 ব্যবহার নির্দেশিকা
          </span>

          <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-600 to-red-500 px-5 py-3 text-white shadow-2xl">
            <p className="my-2 leading-7 text-white/90">
              প্রতিদিন ২ বার - সকালে ও রাতে খাওয়ার পরে পানি দিয়ে গিলে খাবেন।
            </p>

            <div className=" flex bg-gray-300 items-center justify-between text-gray-900 rounded-md p-2">
              <p>
                যে কোন সমস্যায় যোগাযোগ করুন {"01886362484 "}
                <a
                  href="#order"
                  className="animate-soft-ripple inline-flex rounded-md bg-white p-1  text-sm font-bold text-green-700 transition hover:scale-105"
                >
                  WhatsApp
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
