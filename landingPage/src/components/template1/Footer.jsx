"use client";

export default function Footer({ page }) {
  const productName = page?.productName || "";
  const tagline = page?.tagline || "";
  const whatsappNumber = page?.whatsappNumber || "";
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 py-14 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <h2 className="text-3xl font-extrabold">{productName}</h2>
            {tagline && (
              <p className="mt-4 leading-7 text-gray-300">{tagline}</p>
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold">যোগাযোগ</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-300 sm:text-base">
              {whatsappNumber && <li>📞 {whatsappNumber}</li>}
              <li>📍 বাংলাদেশ</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold">আমাদের সুবিধা</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-300 sm:text-base">
              <li>✔ Cash On Delivery</li>
              <li>✔ Fast Delivery</li>
              <li>✔ Secure Checkout</li>
              <li>✔ Premium Support</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-gray-400">
          © {year} {productName}. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
