import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["microsoft-cognitiveservices-speech-sdk"],
  turbopack: {},
};

export default nextConfig;
