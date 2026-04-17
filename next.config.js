/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    trailingSlash: true,
    images: {
        unoptimized: true
    },
   // output: 'export',
   // distDir: 'out',
    assetPrefix: '',
    basePath: ''
}

module.exports = nextConfig