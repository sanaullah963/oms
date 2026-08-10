
import Link from "next/link";

export default function RootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <div className="text-5xl mb-3">🛍️</div>
        <p className="text-(--color-ink-soft) text-sm">
          একটি নির্দিষ্ট প্রোডাক্টের লিংক দিয়ে ভিজিট করুন।
          <Link href="/templates" className="underline">templates</Link>
        </p>
      </div>
    </div>
  );
}
