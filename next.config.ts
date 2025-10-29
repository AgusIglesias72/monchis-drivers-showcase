import type { NextConfig } from "next";

// Need to add the following domain for images: m5ecgo49mnkes8vr.public.blob.vercel-storage.com

const imagesConfig = {
  domains: ['m5ecgo49mnkes8vr.public.blob.vercel-storage.com', 'contoapp.com', 'drive.google.com', 'ueno.com.py'],
}

const nextConfig: NextConfig = {
  /* config options here */
  images: imagesConfig,
  
  // Aumentar el límite de tamaño del body para Server Actions
  serverActions: {
    bodySizeLimit: '5mb',
  },
};

export default nextConfig;
