import type { NextConfig } from "next";

function buildRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "**.r2.dev",
    },
    {
      protocol: "https",
      hostname: "**.amazonaws.com",
    },
  ];

  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  if (publicBaseUrl) {
    try {
      const parsed = new URL(publicBaseUrl);
      const protocol = parsed.protocol.replace(":", "");
      if (protocol === "https" || protocol === "http") {
        patterns.push({
          protocol,
          hostname: parsed.hostname,
          ...(parsed.port ? { port: parsed.port } : {}),
        });
      }
    } catch {
      // Ignore malformed env value during build-time config parsing
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

export default nextConfig;
