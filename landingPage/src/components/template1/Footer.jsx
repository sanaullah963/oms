"use client";

export default function Footer() {
  return (
    <footer className="bg-slate-900 py-14 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <h2 className="text-3xl font-extrabold">আনার দানা</h2>
            <p className="mt-4 leading-7 text-gray-300">প্রিমিয়াম হারবাল প্রোডাক্ট।</p>
          </div>

          <div>
            <h3 className="text-xl font-bold">যোগাযোগ</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-300 sm:text-base">
              <li>📞 01XXXXXXXXX</li>
              <li>📍 বাংলাদেশ</li>
              <li>✉ info@example.com</li>
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
          © 2026 Anar Dana. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
