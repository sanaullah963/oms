/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // domains: ["prnt.sc","ibb.co.com","i.ibb.co","i.ibb.co.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ibb.co.com",
      },
      {
        protocol: "https",
        hostname: "ibb.co.com",
      },
      {
        protocol: "https",
        hostname: "prnt.sc",
      },
      // Admin dashboard থেকে LandingPage.images-এ যেকোনো https image URL দেওয়া
      // যেতে পারে, তাই wildcard hostname allow করা হলো (উপরের নির্দিষ্ট entry-গুলো
      // অপরিবর্তিত রাখা হলো, ক্ষতি নেই — এই wildcard-ই মূলত সব cover করবে)
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  reactCompiler: true,
};

export default nextConfig;
