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
  title: "Dream Helixion | AI 수강 계획 자동 생성",
  description:
    "시간표 사진만 올리면 AI가 전공·교양 수강 계획 4안과 1년 학습 로드맵을 즉시 생성합니다. 베타 무료.",
  keywords: [
    "수강 계획",
    "AI 수강신청",
    "시간표 추천",
    "1년 학습 로드맵",
    "수강 계획표",
    "Dream Helixion",
  ],
  icons: {
    icon: "https://i.ibb.co/8LDvhYvw/Gemini-Generated-Image-ol8g0jol8g0jol8g.png",
    shortcut: "https://i.ibb.co/8LDvhYvw/Gemini-Generated-Image-ol8g0jol8g0jol8g.png",
    apple: "https://i.ibb.co/8LDvhYvw/Gemini-Generated-Image-ol8g0jol8g0jol8g.png",
  },
  openGraph: {
    title: "Dream Helixion | AI 수강 계획 자동 생성",
    description:
      "AI가 만드는 맞춤 수강 계획 4안과 1년 학습 로드맵. 베타 무료.",
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
    title: "Dream Helixion | AI 수강 계획 자동 생성",
    description:
      "AI가 만드는 맞춤 수강 계획 4안과 1년 학습 로드맵. 베타 무료.",
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
