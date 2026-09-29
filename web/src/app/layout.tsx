import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cel-Ron Enterprises Pte Ltd | Marine Spare Parts Singapore',
  description: 'Digital business cards, document sharing, and visitor check-in system for Cel-Ron Enterprises Pte Ltd.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#06101E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#06101E] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
