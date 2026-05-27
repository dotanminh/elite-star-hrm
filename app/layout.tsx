import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elite Star HRM - Human Resource Management',
  description: 'Enterprise Grade Supabase-Next.js Human Resource Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-teal-500/30">
        {children}
      </body>
    </html>
  );
}
