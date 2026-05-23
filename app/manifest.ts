import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Private Chess',
    short_name: 'Chess',
    description: 'A private chess trainer with AI coaching.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#1e1e2e',
    theme_color: '#cba6f7',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
