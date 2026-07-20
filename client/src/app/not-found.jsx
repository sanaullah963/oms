"use client";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-8xl font-extrabold text-indigo-600">404</h1>

        <h2 className="mt-4 text-3xl font-bold text-gray-800">Page Not Found</h2>

        <p className="mt-3 text-gray-600">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
          >
            Go Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition"
          >
            Go Back
          </button>
        </div>

        <div className="mt-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-100">
            <span className="text-4xl">🔍</span>
          </div>
        </div>
      </div>
    </div>
  );
}
