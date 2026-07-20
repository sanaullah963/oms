"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { registerPushNotification } from "@/utils/pushNotification";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(phone, password);
      // লগইন সফল হলে নোটিফিকেশন পারমিশন চাওয়া (ব্যর্থ হলেও লগইন ফ্লো আটকাবে না)
      registerPushNotification().catch(() => {});
      router.push("/");
    } catch (err) {
      setError(err.response?.data?.message || "লগইন করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-800 mb-1">লগইন করুন</h1>
        <p className="text-sm text-gray-500 mb-5">Order Management System</p>

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
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
            <label className="text-xs text-gray-500">পাসওয়ার্ড</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60"
          >
            {loading ? "লগইন হচ্ছে..." : "লগইন"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          একাউন্ট নেই?{" "}
          <Link href="/signup" className="text-indigo-600 font-medium">
            সাইনআপ করুন
          </Link>
        </p>
      </div>
    </div>
  );
}
