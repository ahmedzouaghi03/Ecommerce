import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

const nextConfig: NextConfig = {
  env: {
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID,
    UPLOADTHING_REGIONS: process.env.UPLOADTHING_REGIONS,
  },
  images: {
    domains: [
      "c6ha9vzzh0.ufs.sh",
      "ufs.sh",
      "utfs.io",
      "app-dynamicmockups-psd-engine-production.s3.eu-central-1.amazonaws.com",
      "s3.eu-central-1.amazonaws.com",
    ],
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          "app-dynamicmockups-psd-engine-production.s3.eu-central-1.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(new PrismaPlugin());
    }
    return config;
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
