import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // dev only: let the LIFF page load dev assets through an ngrok tunnel
  allowedDevOrigins: ["*.ngrok-free.dev"],
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "no-store" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/dashboard/:path*", headers: noStore },
      {
        source: "/demo/:path*",
        headers: [
          ...noStore,
          // /demo voice call needs the mic (this rule comes last, so it overrides the global one).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), payment=()",
          },
        ],
      },
      { source: "/login", headers: noStore },
      { source: "/register", headers: noStore },
      { source: "/family", headers: noStore },
    ];
  },
  // One public HTTPS origin (e.g. a single ngrok tunnel) can serve both the LIFF page (/family)
  // and the LINE webhook: forward the webhook to the backend untouched (it checks the signature).
  async rewrites() {
    const backend = process.env.BACKEND_URL;
    return backend
      ? [{ source: "/v1/line/webhook", destination: `${backend}/v1/line/webhook` }]
      : [];
  },
};

export default nextConfig;
