import React from "react";
import { notFound } from "next/navigation";
import TemplateOneBody from "@/components/TemplateOneBody";
import { fetchLandingPageServerSide } from "@/services/landingService";

// --- slug অনুযায়ী একবার সার্ভার-সাইডে ডেটা আনা হয়, তারপর <head>-এর
// metadata এবং পেজ বডি — দুই জায়গাতেই এই একই ডেটা ব্যবহার হবে ---
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await fetchLandingPageServerSide(slug);

  if (!page) {
    return { title: "অর্ডার করুন" };
  }

  const description = page.topTagline || page.tagline || page.description || undefined;

  return {
    title: page.productName,
    description,
    openGraph: {
      title: page.productName,
      description,
      images: page.images?.length ? [page.images[0]] : undefined,
      reviewImages: page.reviewImages?.length ? [page.reviewImages[0]] : undefined,
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const page = await fetchLandingPageServerSide(slug);

  // slug ভুল, পেজ ইনঅ্যাক্টিভ, বা backend সাময়িকভাবে অনুপলব্ধ — সব ক্ষেত্রেই
  // existing not-found.js UI দেখানো হবে, ভাঙা রেন্ডারিং হবে না
  if (!page) {
    notFound();
  }

  return (
    <div>
      <TemplateOneBody slug={slug} page={page} />
    </div>
  );
}
