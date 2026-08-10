"use client";
import { useState } from "react";
import { landingPageService } from "@/services/landingPageService";
import LandingPageForm from "./LandingPageForm";

export default function LandingPageManager({ pages, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const openCreate = () => {
    setEditingPage(null);
    setShowForm(true);
  };

  const openEdit = (page) => {
    setEditingPage(page);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingPage) {
        await landingPageService.update(editingPage._id, data);
      } else {
        await landingPageService.create(data);
      }
      setShowForm(false);
      setEditingPage(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "সেভ করতে ব্যর্থ হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (page) => {
    setBusyId(page._id);
    try {
      await landingPageService.update(page._id, { isActive: !page.isActive });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "আপডেট ব্যর্থ হয়েছে।");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (page) => {
    if (!confirm(`"${page.productName}" পেজটা মুছে ফেলতে চান?`)) return;
    setBusyId(page._id);
    try {
      await landingPageService.remove(page._id);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "মুছতে ব্যর্থ হয়েছে।");
    } finally {
      setBusyId(null);
    }
  };

  const siteBase =
    typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LANDING_URL || "https://deshibazarbd.vercel.app" : "";

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          ➕ নতুন ল্যান্ডিং পেজ তৈরি করুন
        </button>
      )}

      {showForm && (
        <LandingPageForm
          initialData={editingPage}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingPage(null);
          }}
          submitting={submitting}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="py-2 px-3">প্রোডাক্ট</th>
              <th className="py-2 px-3">লিংক</th>
              <th className="py-2 px-3">দাম</th>
              <th className="py-2 px-3">মোট অর্ডার</th>
              <th className="py-2 px-3">স্ট্যাটাস</th>
              <th className="py-2 px-3">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">
                  কোনো ল্যান্ডিং পেজ তৈরি করা হয়নি।
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page._id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium">{page.productName}</td>
                  <td className="py-2 px-3">
                    <a
                      href={`${siteBase}/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      /{page.slug}
                    </a>
                  </td>
                  <td className="py-2 px-3">৳{page.price}</td>
                  <td className="py-2 px-3">{page.totalOrders || 0}</td>
                  <td className="py-2 px-3">
                    {page.isActive ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ✅ সক্রিয়
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        নিষ্ক্রিয়
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => openEdit(page)}
                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium hover:bg-indigo-200"
                      >
                        এডিট
                      </button>
                      <button
                        onClick={() => handleToggleActive(page)}
                        disabled={busyId === page._id}
                        className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md font-medium hover:bg-yellow-200 disabled:opacity-50"
                      >
                        {page.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                      </button>
                      <button
                        onClick={() => handleDelete(page)}
                        disabled={busyId === page._id}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md font-medium hover:bg-red-200 disabled:opacity-50"
                      >
                        মুছুন
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}