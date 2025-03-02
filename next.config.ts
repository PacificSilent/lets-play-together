const withPWA = require("next-pwa")({
    dest: "public",
    disable: process.env.NODE_ENV === "development"
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "export",
    eslint: {
        ignoreDuringBuilds: true
    },
    images: { unoptimized: true }
};

module.exports = withPWA(nextConfig);
