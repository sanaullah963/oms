"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signup(name, phone, password);
      setSuccessMessage(res.message);
    } catch (err) {
      setError(err.response?.data?.message || "একাউন্ট তৈরি করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-700 font-medium mb-4">{successMessage}</p>
          <Link
            href="/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-lg text-sm transition"
          >
            লগইন পেজে যান
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-800 mb-1">নতুন একাউন্ট</h1>
        <p className="text-sm text-gray-500 mb-5">
          সাইনআপের পর এডমিন অনুমোদন করলে আপনি লগইন করতে পারবেন।
        </p>

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">নাম</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">ফোন নম্বর</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">পাসওয়ার্ড (কমপক্ষে ৬ ক্যারেক্টার)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60"
          >
            {loading ? "তৈরি হচ্ছে..." : "সাইনআপ"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          একাউন্ট আছে?{" "}
          <Link href="/login" className="text-indigo-600 font-medium">
            লগইন করুন
          </Link>
        </p>
      </div>
    </div>
  );
}
