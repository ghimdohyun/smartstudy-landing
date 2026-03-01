// Site-wide metadata and navigation links (Taxonomy config pattern)
export const siteConfig = {
  name: "Dream Helixion",
  description:
    "시간표 사진만 올리면 AI가 전공·교양 수강 계획 4안과 1년 학습 로드맵을 즉시 생성합니다. 베타 무료.",
  url: "https://dreamhelixion.com",
  ogImage: "https://dreamhelixion.com/og.jpg",
  locale: "ko_KR",
  links: {
    github: "https://github.com/ghimdohyun/smartstudy-landing",
    twitter: "@dreamhelixion",
  },
} as const;

export type SiteConfig = typeof siteConfig;
