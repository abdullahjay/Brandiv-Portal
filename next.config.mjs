/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

// Ensure NEXTAUTH_URL is never an empty string — next-auth calls new URL() on
// it at module load time and throws "Invalid URL" when the value is "".
// At build time (CI / Hostinger postinstall) we only need a syntactically valid
// placeholder; the real value must be set in the platform's env-var UI.
if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL === "") {
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  images: {
    domains: ["res.cloudinary.com"],
    formats: ["image/avif", "image/webp"],
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },

  // Redirect HTTP → HTTPS in production (only when APP_URL is defined)
  async redirects() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!isProd || !appUrl) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: `${appUrl}/:path*`,
        permanent: true,
      },
    ];
  },

  poweredByHeader: false, // Remove X-Powered-By header
};

export default nextConfig;
