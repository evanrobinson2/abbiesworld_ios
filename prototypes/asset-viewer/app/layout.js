import './globals.css';

export const metadata = {
  title: 'Decorator Machine — ingredient art',
  description:
    'Browse every Decorator Machine ingredient by family, category, and tag, and see the prompt each recipe would send.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
