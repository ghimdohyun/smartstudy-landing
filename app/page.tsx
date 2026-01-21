"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // 상담 AI 챗봇 위젯 삽입
    const chatbotContainer = document.createElement("div");
    chatbotContainer.innerHTML = `
<!-- Groq AI Chatbot (최종 완성) -->
<div id="chatbot" style="position: fixed; bottom: 20px; right: 20px; width: 350px; max-height: 500px; border-radius: 12px; box-shadow: 0 5px 40px rgba(0,0,0,0.16); display: flex; flex-direction: column; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; z-index: 9999; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
    <h3 style="margin: 0; font-size: 16px; font-weight: 600;">상담 AI</h3>
    <button id="close-chat" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0;">×</button>
  </div>
  <div id="messages" style="flex: 1; overflow-y: auto; padding: 15px; background: #f8f9fa; min-height: 250px; display: flex; flex-direction: column; gap: 8px;"></div>
  <div style="padding: 10px; border-top: 1px solid #e0e0e0; display: flex; gap: 8px;">
    <input id="user-input" type="text" placeholder="질문을 입력하세요..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" />
    <button id="send-btn" style="padding: 10px 15px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">전송</button>
  </div>
</div>
    `;
    document.body.appendChild(chatbotContainer);

    (function () {
      const messages = document.getElementById("messages")!;
      const input = document.getElementById("user-input") as HTMLInputElement;
      const sendBtn = document.getElementById("send-btn") as HTMLButtonElement;

      function addMessage(text: string, isUser: boolean) {
        const div = document.createElement("div");
        div.style.padding = "10px 12px";
        div.style.borderRadius = "8px";
        div.style.maxWidth = "85%";
        div.style.wordWrap = "break-word";
        div.style.background = isUser ? "#667eea" : "white";
        div.style.color = isUser ? "white" : "#333";
        div.style.border = isUser ? "none" : "1px solid #e0e0e0";
        if (isUser) div.style.marginLeft = "auto";
        div.textContent = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
      }

      async function send() {
        const msg = input.value.trim();
        if (!msg) return;

        addMessage(msg, true);
        input.value = "";
        addMessage("응답을 기다리는 중...", false);

        try {
          const response = await fetch(
            "https://groq-chatbot-backend--ghimdohyun.replit.app/api/chat",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: msg }),
            }
          );

          const lastMsg = messages.lastChild as HTMLElement | null;
          if (lastMsg && lastMsg.textContent?.includes("응답을 기다리는 중")) {
            lastMsg.remove();
          }

          const data = await response.json();

          if (data.reply) {
            addMessage(data.reply, false);
          } else if (data.error) {
            addMessage("오류: " + (data.error || "API 오류"), false);
          } else {
            addMessage("응답을 받지 못했습니다.", false);
          }
        } catch (err: any) {
          const lastMsg = messages.lastChild as HTMLElement | null;
          if (lastMsg && lastMsg.textContent?.includes("응답을 기다리는 중")) {
            lastMsg.remove();
          }
          console.error("에러:", err);
          addMessage("오류: " + err.message, false);
        }
      }

      sendBtn.onclick = send;
      input.onkeypress = (e: KeyboardEvent) => e.key === "Enter" && send();
      (document.getElementById("close-chat") as HTMLButtonElement).onclick =
        () => {
          (document.getElementById("chatbot") as HTMLElement).style.display =
            "none";
        };

      addMessage("안녕하세요! 무엇을 도와드릴까요?", false);
    })();

    // cleanup
    return () => {
      document.body.removeChild(chatbotContainer);
    };
  }, []);

  useEffect(() => {
    // SmartStudy 계획표 UI 삽입
    const container = document.getElementById("ss-root");
    if (!container) return;

    container.innerHTML = `
<!-- SmartStudy 계획표 AI (두 개 탭: 수강 계획 / 1년 학습 계획) -->
<div id="ss-app" style="min-height:100vh; padding:32px 16px; background:linear-gradient(135deg,#eff6ff,#eef2ff,#f5f3ff); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- 헤더 -->
  <div style="text-align:center; padding:16px 0 24px;">
    <h1 style="font-size:26px; font-weight:700; color:#1f2937; margin-bottom:8px;">SmartStudy 계획표 AI</h1>
    <p style="font-size:14px; color:#4b5563; margin:0;">
      학생 정보와 시간표를 입력하면 수강 계획 4안과 1년 학습 로드맵을 만들어 줍니다.
    </p>

    <!-- 탭 -->
    <div style="display:flex; justify-content:center; margin-top:16px;">
      <div style="background:#fff; border-radius:999px; padding:4px; box-shadow:0 10px 25px rgba(15,23,42,0.08); display:inline-flex;">
        <button id="ss-tab-plan"
          style="border:none; outline:none; padding:8px 18px; border-radius:999px; font-size:13px; font-weight:600; cursor:pointer; background:#10b981; color:#fff; box-shadow:0 6px 12px rgba(16,185,129,0.35);">
          수강 계획표 (Plan A~D)
        </button>
        <button id="ss-tab-year"
          style="border:none; outline:none; padding:8px 18px; border-radius:999px; font-size:13px; font-weight:500; cursor:pointer; background:transparent; color:#6b7280;">
          1년 학습 계획표
        </button>
      </div>
    </div>
  </div>

  <!-- 메인 컨테이너 -->
  <div style="max-width:960px; margin:0 auto;">
    <div style="display:flex; flex-wrap:wrap; gap:16px;">

      <!-- 좌측: 입력 카드 (공통) -->
      <div style="flex:1 1 340px; min-width:0;">
        <div style="background:#fff; border-radius:16px; box-shadow:0 18px 40px rgba(15,23,42,0.09); padding:20px 18px;">
          <div style="display:flex; align-items:center; margin-bottom:12px;">
            <div style="width:28px; height:28px; border-radius:999px; background:#ecfdf5; display:flex; align-items:center; justify-content:center; margin-right:8px;">
              <span style="font-size:16px; color:#10b981;">★</span>
            </div>
            <h2 id="ss-input-title" style="font-size:18px; font-weight:700; color:#111827; margin:0;">
              수강 계획표 입력
            </h2>
          </div>
          <p id="ss-input-desc" style="font-size:12px; color:#6b7280; margin:0 0 10px;">
            아래 두 칸에 내용을 최대한 자세히 적을수록 더 정확한 <b>수강 계획 4안</b>이 만들어집니다.
          </p>

          <!-- 학생 정보 -->
          <div style="margin-top:12px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:4px;">
              학생 정보
            </label>
            <textarea id="ss-studentInfo" rows="4"
              style="width:100%; padding:10px; font-size:13px; border:1px solid #d1d5db; border-radius:10px; resize:vertical; box-sizing:border-box;"
              placeholder="- 학교/학과/학년
- 이번 학기 목표 학점
- 진로/관심 분야 등"></textarea>
          </div>

          <!-- 시간표/지침서 설명 -->
          <div style="margin-top:12px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:4px;">
              시간표/지침서 설명
            </label>
            <textarea id="ss-timetableInfo" rows="4"
              style="width:100%; padding:10px; font-size:13px; border:1px solid #d1d5db; border-radius:10px; resize:vertical; box-sizing:border-box;"
              placeholder="- 현재(또는 희망) 시간표
- 꼭 듣고 싶은/피하고 싶은 과목
- 기타 조건 등을 적어주세요."></textarea>
          </div>

          <!-- 시간표 이미지 URL 입력 (선택) -->
          <div style="margin-top:14px;">
            <label style="display:block; font-size:12px; font-weight:600; color:#374151; margin-bottom:4px;">
              시간표 이미지 URL (선택)
            </label>
            <input id="ss-imageUrl" type="text"
              style="width:100%; padding:8px 10px; font-size:12px; border:1px solid #d1d5db; border-radius:8px; box-sizing:border-box;"
              placeholder="예: https://example.com/timetable.png (공개로 열리는 이미지 주소)" />
            <p style="margin:4px 0 0; font-size:11px; color:#9ca3af;">
              이미지를 웹에 업로드한 뒤, 해당 이미지의 직접 주소를 붙여넣어 주세요. (입력하지 않아도 동작합니다)
            </p>
          </div>

          <!-- 버튼 & 상태 -->
          <div style="margin-top:16px;">
            <button id="ss-send-plan"
              style="width:100%; padding:10px 12px; border:none; border-radius:999px; background:#10b981; color:#fff; font-size:14px; font-weight:600; cursor:pointer; box-shadow:0 12px 22px rgba(16,185,129,0.35);">
              AI 결과 생성하기
            </button>
            <div id="ss-status" style="margin-top:6px; font-size:12px; color:#4b5563;"></div>
          </div>

          <!-- 안내 박스 -->
          <div id="ss-hint-box"
            style="margin-top:12px; padding:10px; border-radius:10px; background:#ecfdf5; border:1px solid #bbf7d0; font-size:11px; color:#166534;">
            • Plan A~D는 서로 다른 전략의 시간표를 제안합니다.<br>
            • 1년 계획(yearPlan)에는 1학기/2학기 목표와 추천 과목이 함께 들어갑니다.
          </div>
        </div>
      </div>

      <!-- 우측: 결과/미리보기 카드 -->
      <div style="flex:1 1 340px; min-width:0;">
        <div style="background:#fff; border-radius:16px; box-shadow:0 18px 40px rgba(15,23,42,0.08); padding:18px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div style="display:flex; align-items:center;">
              <div style="width:26px; height:26px; border-radius:999px; background:#eff6ff; display:flex; align-items:center; justify-content:center; margin-right:8px;">
                <span style="font-size:15px; color:#3b82f6;">✓</span>
              </div>
              <h3 id="ss-result-title" style="font-size:16px; font-weight:700; color:#111827; margin:0;">
                생성된 수강 계획 JSON
              </h3>
            </div>
            <span id="ss-result-sub" style="font-size:11px; color:#6b7280;">
              Plan A~D / yearPlan 구조
            </span>
          </div>

          <p id="ss-result-desc" style="font-size:12px; color:#6b7280; margin:0 0 8px;">
            Plan A~D와 yearPlan 구조로 된 JSON을 그대로 내려보냅니다. 오류가 나면 원문 응답이 표시됩니다.
          </p>

          <pre id="ss-result"
            style="margin-top:8px; padding:10px; border-radius:10px; background:#0f172a; color:#e5e7eb; font-size:11px; max-height:320px; overflow:auto; white-space:pre-wrap; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,'Liberation Mono','Courier New',monospace;">
{/* 아직 생성된 내용이 없습니다. 좌측에서 정보를 입력하고 [AI 결과 생성하기] 버튼을 눌러보세요. */}
          </pre>
        </div>
      </div>

    </div>
  </div>
</div>
    `;

    // 동작 스크립트
    (function () {
      const API_URL =
        "https://groq-chatbot-backend--ghimdohyun.replit.app/api/chat";

      const btn = document.getElementById("ss-send-plan") as HTMLButtonElement;
      const statusEl = document.getElementById("ss-status") as HTMLElement;
      const resultEl = document.getElementById("ss-result") as HTMLElement;

      const tabPlan = document.getElementById("ss-tab-plan") as HTMLButtonElement;
      const tabYear = document.getElementById("ss-tab-year") as HTMLButtonElement;

      const inputTitle = document.getElementById("ss-input-title") as HTMLElement;
      const inputDesc = document.getElementById("ss-input-desc") as HTMLElement;
      const hintBox = document.getElementById("ss-hint-box") as HTMLElement;
      const resultTitle = document.getElementById("ss-result-title") as HTMLElement;
      const resultSub = document.getElementById("ss-result-sub") as HTMLElement;
      const resultDesc = document.getElementById("ss-result-desc") as HTMLElement;

      let currentMode: "plans" | "year" = "plans";

      function setActiveTab(mode: "plans" | "year") {
        currentMode = mode;

        if (mode === "plans") {
          tabPlan.style.background = "#10b981";
          tabPlan.style.color = "#fff";
          tabPlan.style.boxShadow = "0 6px 12px rgba(16,185,129,0.35)";

          tabYear.style.background = "transparent";
          tabYear.style.color = "#6b7280";
          tabYear.style.boxShadow = "none";

          inputTitle.textContent = "수강 계획표 입력";
          inputDesc.textContent =
            "아래 두 칸에 내용을 자세히 적을수록 더 정확한 수강 계획 4안과 yearPlan이 생성됩니다.";
          hintBox.innerHTML =
            "• Plan A~D는 서로 다른 전략의 시간표를 제안합니다.<br>• yearPlan에는 1학기/2학기 목표와 추천 과목이 포함됩니다.";
          resultTitle.textContent = "생성된 수강 계획 JSON";
          resultSub.textContent = "Plan A~D / yearPlan 구조";
          resultDesc.textContent =
            "Plan A~D와 yearPlan 구조의 JSON이 반환됩니다. 오류가 나면 원문 응답이 표시됩니다.";
        } else {
          tabYear.style.background = "#10b981";
          tabYear.style.color = "#fff";
          tabYear.style.boxShadow = "0 6px 12px rgba(16,185,129,0.35)";

          tabPlan.style.background = "transparent";
          tabPlan.style.color = "#6b7280";
          tabPlan.style.boxShadow = "none";

          inputTitle.textContent = "1년 학습 계획표 입력";
          inputDesc.textContent =
            "1년 동안의 목표, 시간표, 동아리/인턴 계획 등을 적으면 주별 루틴이 포함된 학습 로드맵을 생성합니다.";
          hintBox.innerHTML =
            "• 1학기/2학기 별 학습 목표와 전략, 주간 루틴, 마일스톤, 리스크 대응까지 JSON으로 내려갑니다.";
          resultTitle.textContent = "생성된 1년 학습 계획 JSON";
          resultSub.textContent = "year / semesters / weeklyRoutine 구조";
          resultDesc.textContent =
            "1년 학습 로드맵 JSON이 반환됩니다. 프론트에서 주간/월간 뷰 UI로 가공해 사용할 수 있습니다.";
        }

        statusEl.textContent = "";
        resultEl.textContent =
          "{/* 아직 생성된 내용이 없습니다. 좌측에서 정보를 입력하고 [AI 결과 생성하기] 버튼을 눌러보세요. */}";
      }

      tabPlan.addEventListener("click", () => setActiveTab("plans"));
      tabYear.addEventListener("click", () => setActiveTab("year"));

      async function sendRequest() {
        const studentInfo = (
          document.getElementById("ss-studentInfo") as HTMLTextAreaElement
        ).value.trim();
        const timetableInfo = (
          document.getElementById("ss-timetableInfo") as HTMLTextAreaElement
        ).value.trim();
        const imageUrl = (
          document.getElementById("ss-imageUrl") as HTMLInputElement
        ).value.trim();

        if (!studentInfo) {
          alert("학생 정보를 입력해주세요.");
          return;
        }

        const message = `
[학생 정보]
${studentInfo}

[시간표/지침/조건]
${timetableInfo}

[시간표 이미지 URL]
${imageUrl || "없음"}
`.trim();

        statusEl.textContent = "AI가 결과를 생성하는 중입니다...";
        resultEl.textContent = "";
        btn.disabled = true;
        btn.style.opacity = "0.7";

        try {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, mode: currentMode }),
          });

          const data = await res.json();

          if (!res.ok) {
            console.error("API error:", data);
            statusEl.textContent =
              "오류가 발생했습니다: " + (data.error || res.status);
            btn.disabled = false;
            btn.style.opacity = "1";
            return;
          }

          let jsonText: string = data.reply || "";

          jsonText = jsonText
            .replace(/^```json\s*/i, "")
            .replace(/^```/i, "")
            .replace(/```$/i, "")
            .trim();

          try {
            const parsed = JSON.parse(jsonText);
            resultEl.textContent = JSON.stringify(parsed, null, 2);
            statusEl.textContent = "생성 완료!";
          } catch (e) {
            console.error("JSON parse error:", e);
            resultEl.textContent =
              "JSON 파싱 실패, 원문 응답:\n\n" + jsonText;
            statusEl.textContent =
              "응답은 받았지만 JSON 파싱에 실패했습니다.";
          }
        } catch (err: any) {
          console.error(err);
          statusEl.textContent =
            "네트워크 오류가 발생했습니다: " + err.message;
        } finally {
          btn.disabled = false;
          btn.style.opacity = "1";
        }
      }

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        sendRequest();
      });

      setActiveTab("plans");
    })();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50">
      {/* 간단한 히어로 섹션 */}
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-4">
        <h1 className="text-3xl font-semibold text-slate-900">
          SmartStudy AI 계획표
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          수강 계획 4안과 1년 학습 로드맵을 한 번에 설계하고, 오른쪽 아래 상담
          AI에게 언제든 궁금한 점을 물어보세요.
        </p>
      </section>

      {/* 여기 아래에 순수 HTML UI가 주입됨 */}
      <div id="ss-root" />
    </main>
  );
}
