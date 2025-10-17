import type { NextConfig } from "next";

// Need to add the following domain for images: m5ecgo49mnkes8vr.public.blob.vercel-storage.com

const imagesConfig = {
  domains: ['m5ecgo49mnkes8vr.public.blob.vercel-storage.com'],
}

const nextConfig: NextConfig = {
  /* config options here */
  images: imagesConfig,
};

export default nextConfig;
