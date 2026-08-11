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
    ],
  },

  reactCompiler: true,
};

export default nextConfig;
