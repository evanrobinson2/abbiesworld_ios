import './globals.css';

export const metadata = {
  title: "Peg Battle — Abbie's World",
  description:
    'Peg Battle prototype: choose a Battle Card, fire SVG pegs, and duel Bad Doggo.',
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
