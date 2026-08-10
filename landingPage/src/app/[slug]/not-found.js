export default function SlugNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <div className="text-5xl mb-3">🔍</div>
        <h1 className="text-xl font-bold text-(--color-ink)">এই পেজটি খুঁজে পাওয়া যায়নি</h1>
        <p className="text-(--color-ink-soft) text-sm mt-2">
          লিংকটি ভুল হতে পারে অথবা পেজটি এখন বন্ধ আছে।
        </p>
      </div>
    </div>
  );
}
