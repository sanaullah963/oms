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
import { captureAttributionOnLoad, initEngagementTracking} from "@/utils/tracking";


export default function TemplateOneBody({ slug }) {

  const [isOrderVisible, setIsOrderVisible] = useState(false);
  // পেজ লোড হওয়ার সাথে সাথে UTM/fbclid/gclid/referrer ধরে রাখা
  useEffect(() => {
    captureAttributionOnLoad();
    const cleanup = initEngagementTracking(slug);
    return cleanup;
  }, []);

  
  return (
    <>
      <HeroTop />
      <BenefitsSection />
      <FaqSection />
      <TrustSection />
      <TestimonialsSection />
      <UsageGuideSection />
      <OfferSection />
      <OrderSection slug={slug} setIsOrderVisible={setIsOrderVisible}/>

      <FloatingContactButton
        whatsappNumber={"+8801886362484"}
        callNumber={"+8801886362484"}
        imoNumber={"+8801886362484"}
      />

      <StickyMobileBar  isVisible={!isOrderVisible}/>
      <Footer />
    </>
  );
}
