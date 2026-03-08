# Dream Helixion — Replit AI Backend
# FastAPI + Groq (llama-3.3-70b-versatile)
#
# Endpoints:
#   POST /api/chat          — general chatbot (returns { reply })
#   POST /api/generate-plan — structured study plan (returns planA-D + yearPlan JSON)
#
# Required Replit Secret: GROQ_API_KEY

import json
import os
import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq

# ─── App & CORS ────────────────────────────────────────────────────────────────

app = FastAPI(title="Dream Helixion AI Backend")

ALLOWED_ORIGINS = [
    "https://dreamhelixion.com",
    "https://www.dreamhelixion.com",
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ─── Groq client ───────────────────────────────────────────────────────────────

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

MODEL = "llama-3.3-70b-versatile"

# ─── System prompts ────────────────────────────────────────────────────────────

CHAT_SYSTEM = (
    "당신은 Dream Helixion의 AI 학습 어시스턴트입니다. "
    "서강대학교 학생들의 수강 신청, 학업 계획, 진로 관련 질문에 친절하고 전문적으로 답변하세요. "
    "COR(공통필수), LCS(공통선택), HFS(인문사회) 과목 체계를 잘 이해하고 있습니다. "
    "답변은 간결하고 명확하게 한국어로 작성하세요."
)

PLAN_SYSTEM = (
    "당신은 서강대학교 수강 계획 전문 AI입니다. "
    "반드시 지시된 JSON 형식만 반환하세요. "
    "설명 텍스트나 마크다운 코드블록 없이 순수 JSON만 출력하세요."
)

# ─── JSON schema template (injected into the user prompt) ──────────────────────

JSON_SCHEMA = r"""
{
  "planA": {
    "title": "전략명",
    "strategy": "전략 설명",
    "courses": [
      {"code": "COR-101", "name": "과목명", "credits": 3, "requirement": "공통필수", "target": "1학년", "day": "월수", "time": "09:00"}
    ],
    "totalCredits": 18
  },
  "planB": {"title": "", "strategy": "", "courses": [], "totalCredits": 0},
  "planC": {"title": "", "strategy": "", "courses": [], "totalCredits": 0},
  "planD": {"title": "", "strategy": "", "courses": [], "totalCredits": 0},
  "yearPlan": {
    "semesters": [
      {
        "semester": "1학기 (3월~6월)",
        "goal": "학기 목표",
        "recommendedCourses": ["과목명1"],
        "weeklyRoutine": "주간 루틴",
        "milestones": ["마일스톤1"],
        "monthlyGoals": [
          {"month": 3, "goal": "3월 목표", "tasks": ["할일1"]},
          {"month": 4, "goal": "4월 목표", "tasks": []},
          {"month": 5, "goal": "5월 목표", "tasks": []},
          {"month": 6, "goal": "6월 목표", "tasks": []}
        ]
      },
      {
        "semester": "2학기 (9월~12월)",
        "goal": "",
        "recommendedCourses": [],
        "weeklyRoutine": "",
        "milestones": [],
        "monthlyGoals": [
          {"month": 9, "goal": "", "tasks": []},
          {"month": 10, "goal": "", "tasks": []},
          {"month": 11, "goal": "", "tasks": []},
          {"month": 12, "goal": "", "tasks": []}
        ]
      }
    ],
    "monthlyGoals": [
      {"month": 1, "goal": "1월 목표", "tasks": []},
      {"month": 2, "goal": "2월 목표", "tasks": []},
      {"month": 3, "goal": "", "tasks": []},
      {"month": 4, "goal": "", "tasks": []},
      {"month": 5, "goal": "", "tasks": []},
      {"month": 6, "goal": "", "tasks": []},
      {"month": 7, "goal": "7월 목표 (방학)", "tasks": []},
      {"month": 8, "goal": "8월 목표 (방학)", "tasks": []},
      {"month": 9, "goal": "", "tasks": []},
      {"month": 10, "goal": "", "tasks": []},
      {"month": 11, "goal": "", "tasks": []},
      {"month": 12, "goal": "", "tasks": []}
    ],
    "risks": ["리스크 예시"],
    "note": ""
  }
}
"""


def build_plan_prompt(student_info: str, timetable_info: str) -> str:
    return f"""[수강 계획표 AI 생성 요청]

## 학생 정보
{student_info}

## 시간표 / 지침서
{timetable_info or "없음"}

## 지시 사항
1. 반드시 실제 교과목 편성표에 존재하는 과목만 추천하라. 과목코드 앞부분 기준:
   - COR (공통필수): 모든 학생이 이수해야 하는 필수 과목이므로 우선 배치하라.
   - LCS (공통선택): 학생의 관심 분야에 맞는 과목을 선별하라.
   - HFS (인문사회): 인문·사회 계열 교양 과목으로 학점 보충 시 활용하라.
   - 기타 코드(전공필수/전공선택)는 학생의 학과·학년 조건을 엄격히 확인하라.
2. Plan A~D는 각기 다른 전략을 가져야 한다 (학점 극대화 / 진로 집중 / 균형 / 여유 전략).
3. yearPlan은 1학기(3~6월), 2학기(9~12월) 및 12개월 월별 목표를 모두 포함하라.
4. courses 배열 각 항목에 code, requirement, credits, target 필드를 채워라.
5. 응답은 아래 JSON 구조만 반환하라. 설명 텍스트, 마크다운 코드블록 없이 순수 JSON만.

{JSON_SCHEMA}"""


def strip_fences(text: str) -> str:
    """Remove markdown code fences that models sometimes prepend/append."""
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# ─── Routes ────────────────────────────────────────────────────────────────────


@app.get("/")
async def root():
    return {"status": "ok", "service": "Dream Helixion AI Backend"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/chat")
async def chat(request: Request):
    """General chatbot — takes { message }, returns { reply }."""
    try:
        body = await request.json()
        message = body.get("message", "").strip()

        if not message:
            return JSONResponse(
                {"error": "message 필드가 필요합니다."}, status_code=400
            )

        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": CHAT_SYSTEM},
                {"role": "user", "content": message},
            ],
            temperature=0.7,
            max_tokens=2048,
        )
        reply = completion.choices[0].message.content
        return JSONResponse({"reply": reply})

    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.post("/api/generate-plan")
async def generate_plan(request: Request):
    """Structured study-plan generation — takes { studentInfo, timetableInfo },
    returns planA / planB / planC / planD / yearPlan JSON."""
    raw = ""
    try:
        body = await request.json()
        student_info = body.get("studentInfo", "").strip()
        timetable_info = body.get("timetableInfo", "")

        if not student_info:
            return JSONResponse(
                {"error": "studentInfo 필드가 필요합니다."}, status_code=400
            )

        prompt = build_plan_prompt(student_info, timetable_info)

        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": PLAN_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,   # lower temp → more consistent JSON
            max_tokens=4096,
        )
        raw = completion.choices[0].message.content
        cleaned = strip_fences(raw)
        plan = json.loads(cleaned)
        return JSONResponse(plan)

    except json.JSONDecodeError as exc:
        return JSONResponse(
            {"error": f"JSON 파싱 실패: {exc}", "raw": raw[:500]},
            status_code=502,
        )
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)
