/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  allowedDevOrigins: ['192.168.18.7', '10.154.110.159'],
};

module.exports = nextConfig;