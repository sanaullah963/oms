"use client";

const DEFAULT_STEP = {
  title: "",
  description: "প্রতিদিন ২ বার - সকালে ও রাতে খাওয়ার পরে পানি দিয়ে গিলে খাবেন।",
};

export default function UsageGuideSection({ page }) {
  const whatsappNumber = page?.whatsappNumber ? `88${page?.whatsappNumber}` : "";
  // usageProcess খালি থাকলে (পুরনো পেজ) একটা জেনেরিক ডিফল্ট ধাপ দেখানো হয়,
  // ভাঙা/ফাঁকা সেকশন দেখাবে না
  const steps = page?.usageProcess?.length ? page.usageProcess : [DEFAULT_STEP];

  return (
    <section id="use-process" className="relative overflow-hidden bg-gradient-to-b from-white via-green-400 to-white py-16">
      <div className="relative mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
            🌿 ব্যবহার নির্দেশিকা
          </span>

          <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-600 to-red-500 px-5 py-3 text-white shadow-2xl">
            <div className="my-2 space-y-3 text-left">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    {s.title && <p className="font-bold">{s.title}</p>}
                    {s.description && (
                      <p className="leading-7 text-white/90">{s.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {whatsappNumber && (
              <div className=" flex bg-gray-300 items-center justify-between text-gray-900 rounded-md p-2">
                <p>
                  যে কোন সমস্যায় যোগাযোগ করুন {whatsappNumber}{" "}
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="animate-soft-ripple inline-flex rounded-md bg-white p-1  text-sm font-bold text-green-700 transition hover:scale-105"
                  >
                    WhatsApp
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
