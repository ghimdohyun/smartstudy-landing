// FAQ section: accordion-style frequently asked questions

'use client';

import { useState } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Dream Helixion은 어떤 서비스인가요?',
    a: '학생 정보와 시간표를 입력하면 AI가 서로 다른 전략의 수강 계획 4안(Plan A~D)과 1년 학습 로드맵을 즉시 생성해 드리는 서비스입니다.',
  },
  {
    q: '회원가입 없이 사용할 수 있나요?',
    a: '네, 현재 베타 기간에는 회원가입 없이 바로 사용하실 수 있습니다. 생성된 결과는 브라우저의 로컬 스토리지에 저장됩니다.',
  },
  {
    q: '시간표 이미지를 어떻게 사용하나요?',
    a: '시간표 이미지를 드래그하여 업로드하거나, 이미지 URL을 직접 입력할 수 있습니다. AI가 이미지를 분석하여 수강 계획을 생성합니다.',
  },
  {
    q: '어떤 학교 과목을 지원하나요?',
    a: '모든 대학교를 지원합니다. 학생 정보(학과, 학년, 이수 현황)와 시간표를 상세히 입력할수록 더 정확한 전공·교양 수강 계획이 생성됩니다. 학교 편람 PDF를 업로드하면 교과목 정보를 자동으로 읽어들입니다.',
  },
  {
    q: 'JSON / CSV 내보내기는 어떻게 사용하나요?',
    a: "계획 생성 완료 후 /plan 페이지에서 'JSON 다운로드' 또는 'CSV 다운로드' 버튼을 클릭하면 됩니다. CSV 파일은 Excel에서 한글이 깨지지 않도록 BOM이 포함되어 있습니다.",
  },
  {
    q: '유료 플랜은 언제 출시되나요?',
    a: '베타 기간 이후 기본 플랜(₩4,900/월)과 프로 플랜(₩14,900/월)이 출시될 예정입니다. 출시 알림을 받으시려면 contact@dreamhelixion.com으로 이메일을 보내주세요.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="py-[72px] px-5 bg-white dark:bg-slate-950"
      style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
    >
      <div className="max-w-[720px] mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-[12px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-[0.1em] m-0 mb-3">
            자주 묻는 질문
          </p>
          <h2 className="text-[clamp(24px,4vw,34px)] font-extrabold text-gray-900 dark:text-white m-0 mb-3 tracking-tight">
            FAQ
          </h2>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 m-0">
            궁금한 점이 더 있다면 우측 하단 상담 AI에게 물어보세요.
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-2.5">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={[
                  "rounded-2xl border overflow-hidden transition-all duration-200",
                  "bg-white dark:bg-slate-900",
                  isOpen
                    ? "border-violet-300 dark:border-violet-700 shadow-[0_4px_20px_rgba(124,58,237,0.08)] dark:shadow-[0_4px_20px_rgba(124,58,237,0.12)]"
                    : "border-gray-200 dark:border-slate-700 shadow-[0_1px_4px_rgba(15,23,42,0.04)]",
                ].join(" ")}
              >
                {/* Question row */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full px-5 py-[18px] bg-transparent border-none flex justify-between items-center cursor-pointer gap-3 text-left"
                >
                  <span className={[
                    "text-[14px] font-semibold leading-relaxed",
                    isOpen
                      ? "text-violet-700 dark:text-violet-400"
                      : "text-gray-900 dark:text-gray-100",
                  ].join(" ")}>
                    {item.q}
                  </span>
                  <span className={[
                    "text-[18px] shrink-0 transition-transform duration-200 inline-block",
                    isOpen
                      ? "text-violet-600 dark:text-violet-400 rotate-45"
                      : "text-gray-400 dark:text-gray-500",
                  ].join(" ")}>
                    +
                  </span>
                </button>

                {/* Answer */}
                {isOpen && (
                  <div className="px-5 pb-[18px] border-t border-gray-100 dark:border-slate-800">
                    <p className="mt-3.5 mb-0 text-[14px] text-gray-600 dark:text-gray-300 leading-[1.75]">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
