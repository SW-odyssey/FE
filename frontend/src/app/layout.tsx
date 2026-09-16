import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Odyssey",
  description: "오늘의 데이트 코스를 대신 짜 드립니다",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-shell">
        {/* 모바일 전용 서비스라 모든 화면이 이 셸 안에 들어간다 */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
          {children}
        </div>
      </body>
    </html>
  );
}
