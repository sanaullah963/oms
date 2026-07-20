"use client";
import { useState } from "react";
import { facebookPageService } from "@/services/facebookPageService";

function AddPageForm({ onAdded }) {
  const [pageId, setPageId] = useState("");
  const [pageName, setPageName] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await facebookPageService.create(pageId.trim(), pageName.trim(), pageAccessToken.trim());
      setPageId("");
      setPageName("");
      setPageAccessToken("");
      onAdded();
    } catch (err) {
      setError(err.response?.data?.message || "পেজ যোগ করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-gray-700">➕ নতুন পেজ যোগ করুন</h3>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Page ID"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          required
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Page নাম"
          value={pageName}
          onChange={(e) => setPageName(e.target.value)}
          required
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Page Access Token"
          value={pageAccessToken}
          onChange={(e) => setPageAccessToken(e.target.value)}
          required
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
      >
        {loading ? "যোগ হচ্ছে..." : "পেজ যোগ করুন"}
      </button>
    </form>
  );
}

function UpdateTokenRow({ page, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!newToken.trim()) return;
    setLoading(true);
    try {
      await facebookPageService.updateToken(page._id, newToken.trim());
      setNewToken("");
      setEditing(false);
      onUpdated();
    } catch (err) {
      alert(err.response?.data?.message || "টোকেন আপডেট করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium hover:bg-indigo-200"
      >
        🔑 টোকেন আপডেট
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        placeholder="নতুন Access Token পেস্ট করুন"
        value={newToken}
        onChange={(e) => setNewToken(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-xs w-48"
      />
      <button
        onClick={handleSave}
        disabled={loading}
        className="text-xs bg-green-600 text-white px-2 py-1 rounded-md font-medium hover:bg-green-700 disabled:opacity-60"
      >
        {loading ? "..." : "সেভ"}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setNewToken("");
        }}
        className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-md font-medium hover:bg-gray-300"
      >
        বাতিল
      </button>
    </div>
  );
}

function DiagnosticPanel() {
  const [checking, setChecking] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async () => {
    setChecking(true);
    setResult(null);
    try {
      const res = await facebookPageService.getUnmatchedIds();
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "চেক করতে ব্যর্থ হয়েছে।");
    } finally {
      setChecking(false);
    }
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      const res = await facebookPageService.resyncCommentNames();
      alert(`✅ ${res.data.message}`);
    } catch (err) {
      alert(err.response?.data?.message || "Resync করতে ব্যর্থ হয়েছে।");
    } finally {
      setResyncing(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-800">
        🔍 "Unknown Page" সমস্যা ডায়াগনোসিস
      </h3>
      <p className="text-xs text-amber-700">
        যদি কমেন্টে "Unknown Page" দেখায় বা অ্যাকশন কাজ না করে, নিচের বাটনে চেক করুন — Facebook
        থেকে আসা কোন Page ID আপনার নিচের লিস্টের কোনোটার সাথে মিলছে না তা দেখাবে। মিল না পেলে
        সেই আসল ID-টা কপি করে নিচে সঠিক পেজে বসান বা নতুন এন্ট্রি বানান, তারপর "Resync" চাপুন।
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleCheck}
          disabled={checking}
          className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-amber-700 disabled:opacity-60"
        >
          {checking ? "চেক হচ্ছে..." : "🔍 Unmatched ID চেক করুন"}
        </button>
        <button
          onClick={handleResync}
          disabled={resyncing}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {resyncing ? "হচ্ছে..." : "🔄 পুরনো কমেন্টের পেজ নাম Resync করুন"}
        </button>
      </div>

      {result && (
        <div className="text-xs bg-white rounded-lg p-3 border border-amber-200 space-y-2">
          <div>
            <span className="font-semibold">আপনার সেভ করা Page ID:</span>{" "}
            {result.knownPageIds.length === 0 ? (
              <span className="text-red-600">কোনো পেজ যোগ করা নেই!</span>
            ) : (
              result.knownPageIds.map((id) => (
                <code key={id} className="bg-gray-100 px-1.5 py-0.5 rounded mr-1">
                  {id}
                </code>
              ))
            )}
          </div>
          <div>
            <span className="font-semibold">কমেন্টে পাওয়া কিন্তু না-মেলা Page ID:</span>{" "}
            {result.unmatchedPageIds.length === 0 ? (
              <span className="text-green-600">✅ সবগুলো মিলছে, কোনো সমস্যা নেই।</span>
            ) : (
              result.unmatchedPageIds.map((id) => (
                <code key={id} className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-1">
                  {id}
                </code>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacebookPageManager({ pages, onRefresh }) {
  const [busyId, setBusyId] = useState(null);

  const handleToggleActive = async (page) => {
    setBusyId(page._id);
    try {
      await facebookPageService.toggleActive(page._id, !page.isActive);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "আপডেট ব্যর্থ হয়েছে।");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (page) => {
    if (!confirm(`"${page.pageName}" পেজটা মুছে ফেলতে চান? এই পেজের কমেন্টে আর অ্যাকশন নেওয়া যাবে না।`)) {
      return;
    }
    setBusyId(page._id);
    try {
      await facebookPageService.remove(page._id);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "মুছতে ব্যর্থ হয়েছে।");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <DiagnosticPanel />
      <AddPageForm onAdded={onRefresh} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="py-2 px-3">পেজের নাম</th>
              <th className="py-2 px-3">Page ID</th>
              <th className="py-2 px-3">Token</th>
              <th className="py-2 px-3">স্ট্যাটাস</th>
              <th className="py-2 px-3">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-8">
                  কোনো পেজ যোগ করা হয়নি।
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page._id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium">{page.pageName}</td>
                  <td className="py-2 px-3 text-gray-500">{page.pageId}</td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-500">
                    {page.maskedToken}
                  </td>
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
                      <UpdateTokenRow page={page} onUpdated={onRefresh} />
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