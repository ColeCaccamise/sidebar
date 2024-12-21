import withMdx from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  images: {
    domains: ['d2eu2jqkbj4sko.cloudfront.net', 'images.unsplash.com'],
  },
  reactStrictMode: true,
};

const withMDX = withMdx({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
