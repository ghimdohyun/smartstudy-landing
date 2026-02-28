// Root layout — injects ThemeProvider, fonts, and global metadata
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dreamhelixion.com"),
  title: "Dream Helixion | AI 기반 서강대학교 수강신청 로드맵",
  description:
    "복잡한 수강신청은 이제 그만. AI가 당신의 꿈을 위한 최적의 1년 학업 계획과 4가지 시간표 안을 제안합니다. COR·LCS·HFS 교과목 체계 기반, 베타 무료.",
  keywords: [
    "수강 계획",
    "서강대학교",
    "AI 수강신청",
    "시간표 추천",
    "1년 학습 로드맵",
    "COR LCS HFS",
    "Dream Helixion",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Dream Helixion | AI 기반 서강대학교 수강신청 로드맵",
    description:
      "AI가 만드는 맞춤 수강 계획 4안과 1년 학습 로드맵. 서강대 COR·LCS·HFS 체계 반영. 베타 무료.",
    url: "https://dreamhelixion.com",
    siteName: "Dream Helixion",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "/favicon.ico",
        width: 512,
        height: 512,
        alt: "Dream Helixion — AI 수강 계획 서비스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dream Helixion | AI 기반 서강대학교 수강신청 로드맵",
    description:
      "AI가 만드는 맞춤 수강 계획 4안과 1년 학습 로드맵. 서강대 커리큘럼 기반.",
    site: "@dreamhelixion",
    creator: "@dreamhelixion",
    images: ["/favicon.ico"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            {children}
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
