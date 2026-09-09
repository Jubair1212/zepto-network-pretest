import React from 'react';

export const metadata = {
  title: 'Zepto Network',
  description: 'Z-Points Mining Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#020617', color: '#ffffff' }}>
        {children}
      </body>
    </html>
  );
}
