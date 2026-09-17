import './globals.css';

export const metadata = {
  title: "Abbie's World — asset browser",
  description:
    'Browse every image in the repo by kind, family, category and tag, build a recipe, and generate new art from a topic and a style.',
};

// initialScale without maximumScale: the page must still pinch-zoom, which is
// how anyone actually inspects a carve on a tablet.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f5f8',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
