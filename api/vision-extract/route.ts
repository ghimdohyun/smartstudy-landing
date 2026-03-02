// vision-extract — parse 에브리타임/timetable image → structured course list
// Uses Groq Llama 4 Scout (multimodal) to extract course code, name, day, time.
// No GROQ_API_KEY → returns 501 (user must configure key).
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_API_KEY  = process.env.GROQ_API_KEY ?? "";
const VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct";

const groq: Groq | null = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// ─── Extraction prompt ────────────────────────────────────────────────────────

const EXTRACT_PROMPT = `이 이미지는 대학 수강신청 시간표 또는 에브리타임(Everytime) 앱의 시간표 캡처본입니다.
이미지에서 각 수업 블록의 정보를 추출하여 JSON으로 반환하라.

반환 형식 (순수 JSON, 코드블록 없음):
{
  "courses": [
    {
      "code":    "학수번호 (없으면 null)",
      "name":    "과목명",
      "day":     "요일 (한글, 예: 월, 화수, 월수금)",
      "time":    "시간 (예: 09:00, 1교시, 10:30-12:00)",
      "credits": 학점_숫자_또는_null,
      "room":    "강의실 (없으면 null)"
    }
  ],
  "detectedType": "everytime | timetable | unknown"
}

규칙:
- 보이는 모든 수업 블록을 빠짐없이 추출하라
- 요일은 반드시 한글 단일 문자로 통일 (월화수목금 중 해당하는 것)
- 시간은 시간표에 표시된 그대로 기입 (교시 정보가 있으면 교시로, 시각이 있으면 시각으로)
- 과목명에 CJK/중국어가 섞여 있으면 제거하고 순수 한국어만 남겨라
- 확신할 수 없는 필드는 null로 남겨라`;

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!groq) {
    return NextResponse.json(
      { error: "GROQ_API_KEY가 설정되지 않았습니다. 환경변수를 확인하세요." },
      { status: 501 }
    );
  }

  let imageUrl: string;
  try {
    const body = await req.json() as { imageUrl?: string };
    if (!body.imageUrl?.trim()) {
      return NextResponse.json({ error: "imageUrl 필드가 필요합니다." }, { status: 400 });
    }
    imageUrl = body.imageUrl.trim();
  } catch {
    return NextResponse.json({ error: "요청 본문을 파싱할 수 없습니다." }, { status: 400 });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACT_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.1, // low temp for extraction accuracy
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI 응답 파싱 실패", raw }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Groq API 오류: ${msg}` }, { status: 500 });
  }
}
