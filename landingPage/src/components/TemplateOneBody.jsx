"use client";
import { useEffect, useState } from "react";
import FloatingContactButton from "@/components/template1/FloatingContactButton";
import HeroTop from "@/components/template1/HeroTop";
import BenefitsSection from "@/components/template1/BenefitsSection";
import FaqSection from "@/components/template1/FaqSection";
import TrustSection from "@/components/template1/TrustSection";
import TestimonialsSection from "@/components/template1/TestimonialsSection";
import UsageGuideSection from "@/components/template1/UsageGuideSection";
import OfferSection from "@/components/template1/OfferSection";
import OrderSection from "@/components/template1/OrderSection";
import StickyMobileBar from "@/components/template1/StickyMobileBar";
import Footer from "@/components/template1/Footer";
import RecentOrderPopup from "@/components/template1/RecentOrderPopup";
import { captureAttributionOnLoad, initEngagementTracking } from "@/utils/tracking";

// page = server-side এ fetch করা LandingPage ডকুমেন্ট (slug অনুযায়ী)।
// এটাই এই টেমপ্লেটের সব section-এর জন্য একমাত্র/central data source —
// কোনো child component নিজে থেকে আলাদা API কল করে না।
export default function TemplateOneBody({ slug, page }) {
  const [isOrderVisible, setIsOrderVisible] = useState(false);

  // পেজ লোড হওয়ার সাথে সাথে UTM/fbclid/gclid/referrer ধরে রাখা
  useEffect(() => {
    captureAttributionOnLoad();
    const cleanup = initEngagementTracking(slug);
    return cleanup;
  }, []);

  // এখন WhatsApp/Call/IMO — তিনটাই আলাদা field, একটা আরেকটার fallback না —
  // অন্তত একটা নম্বর থাকলেই ফ্লোটিং কন্টাক্ট বাটন দেখানো হবে, প্রতিটা অপশন
  // নিজের নম্বর অনুযায়ী ভেতরে-ভেতরে conditionally hide হবে (FloatingContactButton.jsx দেখুন)
  const whatsappNumber = page?.whatsappNumber ? `88${page?.whatsappNumber}` : "";
  const phoneNumber = page?.phoneNumber || "";
  const imoNumber = page?.imoNumber || "";
  const hasAnyContact = whatsappNumber || phoneNumber || imoNumber;

  return (
    <>
      <RecentOrderPopup page={page} />
      <HeroTop page={page} />
      <BenefitsSection page={page} />
      <FaqSection page={page} />
      <TrustSection page={page} />
      <TestimonialsSection page={page} />
      <UsageGuideSection page={page} />
      <OfferSection page={page} />
      <OrderSection page={page} slug={slug} setIsOrderVisible={setIsOrderVisible} />

      {hasAnyContact && (
        <FloatingContactButton
          whatsappNumber={whatsappNumber}
          callNumber={phoneNumber}
          imoNumber={imoNumber}
        />
      )}

      <StickyMobileBar page={page} isVisible={!isOrderVisible} />
      <Footer page={page} />
    </>
  );
}