/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // 👈 ADD THIS
  experimental: {
    serverComponentsExternalPackages: [
      "@sparticuz/chromium-min",
      "puppeteer-core",
    ],
  },
};

module.exports = nextConfig;