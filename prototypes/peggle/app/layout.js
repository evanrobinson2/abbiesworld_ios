import './globals.css';

export const metadata = {
  title: "Plink — Abbie's World Peggle Land",
  description:
    'Localhost prototype of Plink, the marble-drop minigame in Peggle Land.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7e7f0',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
