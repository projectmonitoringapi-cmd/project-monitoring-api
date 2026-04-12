/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  serverExternalPackages: [
    "@sparticuz/chromium-min",
    "puppeteer-core",
  ],
};

module.exports = nextConfig;