/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Logos y avatares se sirven desde Supabase Storage (bucket público)
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
