import './globals.css';

export const metadata = {
  title: 'Essence Kit — art QA',
  description:
    'Generated and carved ingredient art for the Decorator Machine, with the backgrounds needed to judge an alpha channel.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
