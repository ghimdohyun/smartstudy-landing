// Floating AI counseling chatbot — glassmorphism UI, FAQ chips, dark-mode aware
'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { getUniversityConfig } from '@/lib/university-kb';

const FAQ_CHIPS_BY_UNIVERSITY: Record<string, string[]> = {
  'kyungsung-sw': [
    '수강신청 기간은 언제인가요?',
    'EO203 전산수학을 꼭 들어야 하나요?',
    '재수강 제도를 알려주세요',
    '평점 계산 방법을 알려주세요',
  ],
  'sogang-general': [
    '수강신청 기간은 언제인가요?',
    'COR 이수 요건이 무엇인가요?',
    '재수강 제도를 알려주세요',
    '평점 계산 방법을 알려주세요',
  ],
};

const DEFAULT_FAQ_CHIPS = [
  '수강신청 기간은 언제인가요?',
  '필수과목 이수 방법을 알려주세요',
  '재수강 제도를 알려주세요',
  '평점 계산 방법을 알려주세요',
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [universityId, setUniversityId] = useState('kyungsung-sw');
  const messagesRef = useRef<HTMLDivElement>(null);
  const { messages, loading, send } = useChat();

  // Re-read university selection whenever the chatbot is opened
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const stored = localStorage.getItem('smartstudy_university');
      if (stored) setUniversityId(stored);
    }
  }, [open]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const config = getUniversityConfig(universityId);
  const faqChips = FAQ_CHIPS_BY_UNIVERSITY[universityId] ?? DEFAULT_FAQ_CHIPS;

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    send(msg, universityId);
    setInput('');
  };

  const isInitial = messages.length === 1 && messages[0].role === 'assistant';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 58, height: 58, borderRadius: '50%',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          color: 'white', border: 'none', fontSize: 26,
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(102,126,234,0.5), 0 2px 8px rgba(0,0,0,0.12)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="AI 수강신청 상담 챗봇 열기"
      >
        🎓
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, width: 368,
        maxHeight: 560, borderRadius: 20,
        boxShadow: '0 32px_80px_rgba(15,23,42,0.2), 0 8px_32px_rgba(102,126,234,0.14)'.replace(/_/g,' '),
        display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.7)',
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        zIndex: 9999, overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
          color: 'white', padding: '13px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 22 }}>🎓</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              수강신청 상담 AI
            </p>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.82, lineHeight: 1.2 }}>
              {config.name} {config.department} 어시스턴트
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'none', border: 'none', color: 'white', fontSize: 22,
            cursor: 'pointer', lineHeight: 1, opacity: 0.8, padding: '4px 6px',
          }}
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {/* ── Messages ── */}
      <div
        ref={messagesRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '12px 12px 8px',
          background: 'rgba(248,250,252,0.85)',
          display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 200,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: '9px 13px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              maxWidth: '88%', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.55,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg,#667eea,#764ba2)'
                : 'rgba(255,255,255,0.96)',
              color: msg.role === 'user' ? '#fff' : '#111827',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(0,0,0,0.07)',
              boxShadow: msg.role === 'user'
                ? '0 4px 12px rgba(102,126,234,0.28)'
                : '0 2px 8px rgba(0,0,0,0.05)',
              marginLeft: msg.role === 'user' ? 'auto' : undefined,
            }}
          >
            {msg.content}
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div
            style={{
              padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
              maxWidth: '88%', background: 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#667eea,#764ba2)',
                  display: 'inline-block',
                  animation: `chatDot 1.2s ease-in-out ${i * 0.22}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {/* FAQ quick-reply chips — shown only before first user message */}
        {isInitial && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.02em' }}>
              자주 묻는 질문
            </p>
            {faqChips.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                style={{
                  textAlign: 'left', padding: '7px 12px', fontSize: 12,
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(102,126,234,0.28)',
                  borderRadius: 12, cursor: 'pointer',
                  color: '#4f46e5', fontWeight: 500, lineHeight: 1.4,
                  boxShadow: '0 1px 4px rgba(102,126,234,0.1)',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div
        style={{
          padding: '10px 12px', flexShrink: 0,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', gap: 8,
          background: 'rgba(255,255,255,0.98)',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="수강신청 관련 질문을 입력하세요..."
          disabled={loading}
          style={{
            flex: 1, padding: '9px 13px',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 10, fontSize: 13, outline: 'none',
            background: 'rgba(248,250,252,0.9)',
            color: '#000',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading}
          style={{
            padding: '9px 16px',
            background: loading ? '#e5e7eb' : 'linear-gradient(135deg,#667eea,#764ba2)',
            color: loading ? '#9ca3af' : 'white',
            border: 'none', borderRadius: 10,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}
        >
          전송
        </button>
      </div>

      <style>{`
        @keyframes chatDot {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
