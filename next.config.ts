import type { NextConfig } from "next";

const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];
// Pages that handle one-time links and credentials: never cached, and never send their URL to another site.
// ("same-origin" rather than "no-referrer": no-referrer makes browsers send "Origin: null" on form posts,
// which Next.js's server-action forgery check rejects.)
const sensitive = [
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: security },
      { source: "/c/:path*", headers: sensitive },
      { source: "/login", headers: sensitive },
      { source: "/signup/:path*", headers: sensitive },
      { source: "/reset-password", headers: sensitive },
      { source: "/forgot-password", headers: sensitive },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
