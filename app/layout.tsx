import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elite Star HRM - Hệ Thống Quản Lý Nhân Sự & Chấm Công',
  description: 'Hệ thống quản lý nhân sự chuyên nghiệp, chấm công và quản lý nghỉ phép cho phức hợp Elite Star.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className="min-h-screen antialiased selection:bg-teal-500/30">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
