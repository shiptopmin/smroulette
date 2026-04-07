import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "구슬 추첨기",
  description: "물리 기반 구슬 추첨 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col" style={{ background: '#0f0f1a' }}>{children}</body>
    </html>
  );
}
