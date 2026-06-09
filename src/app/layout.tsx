import type { Metadata } from 'next';
import { siteConfig } from '@/data/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${siteConfig.domain}`),
  title: `${siteConfig.name} · ${siteConfig.title}`,
  description: siteConfig.meta.description,
  keywords: siteConfig.meta.keywords,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `https://${siteConfig.domain}`,
    siteName: siteConfig.name,
    title: `${siteConfig.name} · ${siteConfig.title}`,
    description: siteConfig.meta.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} · ${siteConfig.title}`,
    description: siteConfig.meta.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="h-screen w-screen overflow-hidden bg-bg-primary text-text-primary">
        <main className="relative h-full w-full">{children}</main>
      </body>
    </html>
  );
}
