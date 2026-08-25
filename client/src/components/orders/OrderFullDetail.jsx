"use client";
import React, { useState } from "react";

// ছোট রিইউজেবল হেল্পার — একটা লেবেল-ভ্যালু সারি দেখায়, খালি/null হলে "—" দেখায়
function Row({ label, value }) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-gray-300 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right break-all">
        {isEmpty ? "—" : String(value)}
      </span>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-md mb-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700"
      >
        <span>{title}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-3 py-2 bg-white">{children}</div>}
    </div>
  );
}

function formatDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString("bn-BD");
  } catch {
    return String(d);
  }
}

export default function OrderFullDetail({ order }) {
  const [showRawJson, setShowRawJson] = useState(false);

  if (!order) return null;

  const c = order.courier || {};
  const t = order.tracking || {};
  const f = order.fraudCheck || {};
  const ch = order.courierHistory || {};
  const activities = Array.isArray(order.activities) ? order.activities : [];

  return (
    <div className="bg-white rounded-xl shadow-md p-3 mb-3 border border-gray-200">
      {/* --- হেডার --- */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-gray-900">{order.castomerName || "N/A"}</h3>
          <span className="text-xs text-gray-500">ID: {order._id}</span>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-indigo-100 text-indigo-700">
          {order.orderStatus}
        </span>
      </div>

      {/* --- ১. মূল অর্ডার তথ্য --- */}
      <Section title="📦 মূল অর্ডার তথ্য">
        <Row label="Order ID" value={order._id} />
        <Row
          label="ফোন নম্বর"
          value={Array.isArray(order.castomerPhone) ? order.castomerPhone.join(", ") : order.castomerPhone}
        />
        <Row label="প্রোডাক্ট কোড" value={order.productCode} />
        <Row label="টোটাল COD" value={order.totalCOD} />
        <Row label="অর্ডার সোর্স" value={order.orderSource} />
        <Row label="Origin" value={order.origin} />
        <Row label="অর্ডার স্ট্যাটাস" value={order.orderStatus} />
        <Row label="শিডিউল ডেট" value={formatDate(order.scheduledDate)} />
        <Row label="তৈরি করেছেন" value={order.createdByName} />
        <Row label="createdBy (ID)" value={order.createdBy} />
        <Row label="প্রয়োজনীয় মনোযোগ" value={order.needsAttention ? "হ্যাঁ" : "না"} />
        <Row label="নোট" value={order.note} />
        <Row label="স্থায়ী নোট" value={order.permanentNote} />
        <Row label="Raw Input Text" value={order.rawInputText} />
      </Section>

      {/* --- ২. কুরিয়ার তথ্য --- */}
      <Section title="🚚 কুরিয়ার তথ্য (courier)">
        <Row label="Tracking ID" value={c.trackingId} />
        <Row label="Booking Status" value={c.bookingStatus} />
        <Row label="Courier Status" value={c.courierStatus} />
        <Row label="বুক হয়েছে" value={formatDate(c.bookedAt)} />
        <Row label="স্ট্যাটাস আপডেট হয়েছে" value={formatDate(c.statusUpdatedAt)} />
        <Row label="ডেলিভারড COD এমাউন্ট" value={c.deliveredCodAmount} />
        <Row label="ডেলিভারি চার্জ" value={c.deliveryCharge} />
        <Row label="COD চার্জ (১%)" value={c.codChargeAmount} />
        <Row
          label="Response Data (raw)"
          value={c.responseData ? JSON.stringify(c.responseData) : null}
        />
      </Section>

      {/* --- ৩. কুরিয়ার হিস্ট্রি (রিপিট কাস্টমার) --- */}
      <Section title="📊 কুরিয়ার হিস্ট্রি (courierHistory)" defaultOpen={false}>
        <Row label="আমাদের হিস্ট্রি (our)" value={ch.our} />
        <Row label="সব কুরিয়ার — সফল" value={ch.all?.success} />
        <Row label="সব কুরিয়ার — ক্যানসেল" value={ch.all?.cancel} />
      </Section>

      {/* --- ৪. ট্র্যাকিং / Meta Pixel তথ্য --- */}
      <Section title="🎯 ট্র্যাকিং / Meta Pixel (tracking)" defaultOpen={false}>
        <Row label="Session ID" value={t.sessionId} />
        <Row label="Landing Page Slug" value={t.landingPageSlug} />
        <Row label="fbp" value={t.fbp} />
        <Row label="fbc" value={t.fbc} />
        <Row label="fbclid" value={t.fbclid} />
        <Row label="gclid" value={t.gclid} />
        <Row label="UTM Source" value={t.utmSource} />
        <Row label="UTM Medium" value={t.utmMedium} />
        <Row label="UTM Campaign" value={t.utmCampaign} />
        <Row label="UTM Term" value={t.utmTerm} />
        <Row label="UTM Content" value={t.utmContent} />
        <Row label="Referrer" value={t.referrer} />
        <Row label="IP" value={t.ip} />
        <Row label="User Agent" value={t.userAgent} />
        <Row label="Fingerprint Hash" value={t.fingerprintHash} />
      </Section>

      {/* --- ৫. ফ্রড/ডুপ্লিকেট ডিটেকশন --- */}
      <Section title="🚨 ফ্রড ডিটেকশন (fraudCheck)" defaultOpen={false}>
        <Row label="সন্দেহজনক?" value={f.isSuspicious ? "হ্যাঁ" : "না"} />
        <Row label="Review Status" value={f.reviewStatus} />
        <Row label="Reviewed By" value={f.reviewedByName} />
        <Row label="Reviewed At" value={formatDate(f.reviewedAt)} />
        {Array.isArray(f.reasons) && f.reasons.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-gray-500">কারণসমূহ:</span>
            {f.reasons.map((r, i) => (
              <div key={i} className="text-xs bg-red-50 text-red-700 rounded px-2 py-1 mt-1">
                {r.rule} — {r.label} (ম্যাচড অর্ডার: {(r.matchedOrderIds || []).length} টা)
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* --- ৬. অ্যাক্টিভিটি টাইমলাইন --- */}
      <Section title={`🕒 অ্যাক্টিভিটি টাইমলাইন (${activities.length})`} defaultOpen={false}>
        {activities.length === 0 && (
          <p className="text-xs text-gray-400">কোনো অ্যাক্টিভিটি নেই</p>
        )}
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {activities
            .slice()
            .reverse()
            .map((a, i) => (
              <div key={i} className="text-xs bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
                <div className="flex justify-between text-gray-400">
                  <span>{a.author} · {a.type}</span>
                  <span>{formatDate(a.timestamp)}</span>
                </div>
                <div className="text-gray-700 mt-0.5">{a.description}</div>
                {a.details && (
                  <div className="text-gray-400 mt-0.5 break-all">
                    {JSON.stringify(a.details)}
                  </div>
                )}
              </div>
            ))}
        </div>
      </Section>

      {/* --- ৭. Raw JSON (fallback — মডেলে ভবিষ্যতে নতুন ফিল্ড যোগ হলেও এখানে ধরা পড়বে) --- */}
      <button
        type="button"
        onClick={() => setShowRawJson((s) => !s)}
        className="text-xs text-indigo-600 hover:underline mt-1"
      >
        {showRawJson ? "Raw JSON লুকান ▲" : "Raw JSON দেখুন (সম্পূর্ণ ডকুমেন্ট) ▼"}
      </button>
      {showRawJson && (
        <pre className="text-xs bg-gray-900 text-green-300 rounded-md p-2 mt-2 overflow-x-auto max-h-80 overflow-y-auto">
          {JSON.stringify(order, null, 2)}
        </pre>
      )}
    </div>
  );
}