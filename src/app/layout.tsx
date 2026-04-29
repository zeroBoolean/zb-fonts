// src/app/layout.tsx
// Minimal root layout — this project is API-only.
// Add a landing page here later if needed.

export const metadata = {
  title: 'Font CDN',
  description: 'Self-hosted font delivery network',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
