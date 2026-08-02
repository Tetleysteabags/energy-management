import type { NextConfig } from "next";

/**
 * Static security headers. The Content-Security-Policy is not here — it carries
 * a per-request nonce and is set in middleware.ts instead.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...SECURITY_HEADERS,
          // Signed-in pages hold health data; only the public pages should be
          // indexable, and those opt back in below.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // Later rules win, but only for keys they actually set — so this has to
        // state the opposite value rather than simply omit the header.
        source: "/:path(how-it-works|privacy)",
        headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
      },
    ];
  },
};

export default nextConfig;
