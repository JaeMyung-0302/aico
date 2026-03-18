import type { Metadata, Viewport } from "next";
import "./globals.scss";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Portfolio | Jaemyeong Lee",
  description:
    "AI와 대화하며 탐색하는 인터랙티브 포트폴리오. 프로젝트, 기술 스택, 경력을 AI에게 물어보세요.",
  openGraph: {
    title: "Portfolio | Jaemyeong Lee",
    description: "AI와 대화하며 탐색하는 인터랙티브 포트폴리오",
    type: "website",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://portfolio.ijaemyeong.dev"),
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
