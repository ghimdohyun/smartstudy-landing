// Site-wide metadata and navigation links (Taxonomy config pattern)
export const siteConfig = {
  name: "Dream Helixion",
  description:
    "AI가 만드는 맞춤 수강 계획 4안과 1년 학습 로드맵. 서강대 COR·LCS·HFS 체계 반영. 베타 무료.",
  url: "https://dreamhelixion.com",
  ogImage: "https://dreamhelixion.com/og.jpg",
  locale: "ko_KR",
  links: {
    github: "https://github.com/ghimdohyun/smartstudy-landing",
    twitter: "@dreamhelixion",
  },
} as const;

export type SiteConfig = typeof siteConfig;
