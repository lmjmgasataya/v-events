import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok-free.dev"],
  experimental: {
    serverActions: {
      // Default is 1MB; large participant CSVs are sent to importParticipantsCsv as text.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
