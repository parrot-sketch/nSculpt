import type { Metadata, Viewport } from 'next';
import { Roboto, Roboto_Serif } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

const robotoSerif = Roboto_Serif({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-roboto-serif',
});

export const metadata: Metadata = {
  title: 'Nairobi Sculpt EHR',
  description: 'Surgical EHR & Inventory System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoSerif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}




