import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Toaster } from 'sonner';
import PlausibleProvider from 'next-plausible';
import { CSPostHogProvider } from './providers';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

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
        className={`${geistSans.variable} ${geistMono.variable} dark:dark bg-background px-6 text-typography-weak antialiased md:px-0`}
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
