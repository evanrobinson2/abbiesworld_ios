import './globals.css';

export const metadata = {
  title: "Abbie's World · Media Drop",
  description: 'Drop Suno songs and Midjourney images into Abbie’s World.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'AW Drop',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#0e1c24',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
