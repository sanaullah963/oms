import { Hind_Siliguri } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata = {
  title: "অর্ডার করুন",
  description: "সহজে অর্ডার করুন, ক্যাশ অন ডেলিভারিতে পেমেন্ট করুন",
};

export const viewport = {
  themeColor: "#b3184f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body className={`${hindSiliguri.variable} font-sans antialiased`} cz-shortcut-listen="true">
        {/* --- Meta Pixel বেস কোড: fbq init সাথে সাথে হয় (যাতে _fbp/_fbc কুকি দ্রুত সেট
        হয় ও পরবর্তী ইভেন্টের জন্য fbq প্রস্তুত থাকে), কিন্তু PageView ট্র্যাক করা হয়
        পেজ লোডের ~১ সেকেন্ড পর — এতে যেসব ভিজিটর সাথে সাথেই পেজ ছেড়ে চলে যায়
        (বট বা ভুল ক্লিক) তারা PageView-এ কাউন্ট হয় না, ফলে এই ইভেন্টের ওপর ভিত্তি করে
        বানানো Custom Audience-এর মান (quality) ভালো হয় --- */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel-base" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              setTimeout(function () { fbq('track', 'PageView'); }, 1000);
            `}
          </Script>
        )}
        {children}
      </body>
    </html>
  );
}