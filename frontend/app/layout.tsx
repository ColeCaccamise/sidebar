import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import PlausibleProvider from 'next-plausible';
import { CSPostHogProvider } from './providers';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Sidebar',
    template: '%s | Sidebar',
  },
  description:
    'Sidebar is a full-stack dashboard for building modern SaaS products.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`bg-black`}>
      <body
        className={`${inter.className} dark:dark bg-background text-typography-weak antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
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
        </ThemeProvider>
      </body>
    </html>
  );
}
