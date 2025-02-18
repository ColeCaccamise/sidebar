import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import PlausibleProvider from 'next-plausible';
import { CSPostHogProvider } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Go Dashboard',
  description: 'SaaS boilerplate built with Next.js and Go.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} dark:dark bg-background text-typography-weak antialiased`}
      >
        <Toaster duration={5000} position="bottom-right" />
        <div className="flex min-h-screen w-full flex-col items-center justify-center font-sans antialiased">
          <PlausibleProvider
            domain={process.env.NEXT_PUBLIC_APP_URL || ''}
            trackOutboundLinks={true}
            taggedEvents={true}
            trackLocalhost={false}
          >
            <CSPostHogProvider>
              <div className="flex w-full flex-col items-center">
                {children}
              </div>
            </CSPostHogProvider>
          </PlausibleProvider>
        </div>
      </body>
    </html>
  );
}
