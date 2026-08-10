"use client";
import { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import AuthGuard from "@/components/auth/AuthGuard";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import { blockService } from "@/services/blockService";
import Link from "next/link";

function BlockedCustomersContent() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blockService.getAll();
      setBlocked(res.data.blocked || []);
    } catch (err) {
      console.error("Blocked customers fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const handleManualBlock = async (e) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(phone)) {
      toast.error("সঠিক ১১ ডিজিটের ফোন নম্বর দিন");
      return;
    }
    setSubmitting(true);
    try {
      await blockService.create({ phone, reason });
      toast.success("কাস্টমার ব্লক করা হয়েছে");
      setPhone("");
      setReason("");
      fetchBlocked();
    } catch (err) {
      toast.error(err.response?.data?.message || "ব্লক করতে ব্যর্থ হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (id) => {
    try {
      await blockService.unblock(id);
      toast.success("আনব্লক করা হয়েছে");
      setBlocked((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "আনব্লক করতে ব্যর্থ হয়েছে");
    }
  };

  return (
    <div className="p-2 md:p-6 bg-gray-100 min-h-screen">
      <SearchAndMenu />
      <div className="max-w-4xl mx-auto mt-3 space-y-4 pb-10">
        <div>
          <Link href="/dashboard" className="text-sm text-indigo-600 font-medium">
            ← ড্যাশবোর্ড
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mt-1">🚫 ব্লক করা কাস্টমার</h1>
          <p className="text-sm text-gray-500">
            এখানে ম্যানুয়ালি ব্লক করা কাস্টমাররা লিস্টেড থাকে। ব্লক করা কাস্টমার
            ল্যান্ডিং পেজে অর্ডার সাবমিট করতে চাইলে একটা Popup দেখবে (WhatsApp-এ
            যোগাযোগ করতে বলা হবে), অর্ডার তৈরি হবে না।
          </p>
        </div>

        {/* ম্যানুয়াল ব্লক ফর্ম */}
        <form
          onSubmit={handleManualBlock}
          className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-2 items-end"
        >
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500">ফোন নম্বর</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="01XXXXXXXXX"
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500">কারণ (ঐচ্ছিক)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            {submitting ? "..." : "ব্লক করুন"}
          </button>
        </form>

        {/* লিস্ট */}
        <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">লোড হচ্ছে...</p>
          ) : blocked.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">কোনো ব্লক করা কাস্টমার নেই।</p>
          ) : (
            blocked.map((b) => (
              <div key={b._id} className="p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-semibold text-gray-800">
                    {b.phone || "—"}{" "}
                    {b.castomerName && <span className="text-gray-500">({b.castomerName})</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {[
                      b.fingerprintHash && "Fingerprint",
                      b.ip && "IP",
                      (b.fbp || b.fbc || b.fbclid) && "Facebook",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "শুধু ফোন দিয়ে"}
                  </p>
                  {b.reason && <p className="text-xs text-gray-500 mt-0.5">কারণ: {b.reason}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    ব্লক করেছেন: {b.blockedByName || "—"}
                  </p>
                </div>
                <button
                  onClick={() => handleUnblock(b._id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                >
                  আনব্লক
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <ToastContainer autoClose={1500} />
    </div>
  );
}

export default function BlockedCustomersPage() {
  return (
    <AuthGuard adminOnly>
      <BlockedCustomersContent />
    </AuthGuard>
  );
}
