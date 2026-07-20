const FIN_CARDS = [
  { key: "totalDeliveryCharge", label: "মোট ডেলিভারি চার্জ (কুরিয়ার কেটেছে)" },
  { key: "totalCodCharge", label: "মোট COD চার্জ (১%)" },
  { key: "cancelledDeliveryCharge", label: "ক্যান্সেলড পার্সেলের চার্জ" },
  { key: "netDeduction", label: "মূল ব্যালেন্স থেকে মোট কর্তন" },
];

export default function FinancialSummary({ totals }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 mb-2">💰 ফাইন্যান্সিয়াল সামারি</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {FIN_CARDS.map((c) => (
          <div key={c.key} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-lg font-bold text-gray-800">
              ৳{(totals[c.key] || 0).toLocaleString("bn-BD")}
            </div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {totals.mismatchCount > 0 && (
        <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm font-medium">
          ⚠️ {totals.mismatchCount}টি ডেলিভারড পার্সেলে COD এমাউন্ট গরমিল পাওয়া গেছে — নিচে দেখুন।
        </div>
      )}
    </div>
  );
}
