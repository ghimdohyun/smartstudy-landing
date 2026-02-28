// Floating AI chatbot widget for SmartStudy

'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';

export default function Chatbot() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const { messages, loading, send } = useChat();

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    send(input.trim());
    setInput('');
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          color: 'white', border: 'none', fontSize: 22,
          cursor: 'pointer', boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
          zIndex: 9999,
        }}
        aria-label="챗봇 열기"
      >
        💬
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: 350,
      maxHeight: 500, borderRadius: 12,
      boxShadow: '0 5px 40px rgba(0,0,0,0.16)',
      display: 'flex', flexDirection: 'column',
      background: 'white',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      zIndex: 9999, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
        color: 'white', padding: '15px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>상담 AI</h3>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        style={{
          flex: 1, overflowY: 'auto', padding: 15,
          background: '#f8f9fa', minHeight: 250,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: '10px 12px', borderRadius: 8,
              maxWidth: '85%', wordBreak: 'break-word',
              background: msg.role === 'user' ? '#667eea' : 'white',
              color: msg.role === 'user' ? 'white' : '#333',
              border: msg.role === 'user' ? 'none' : '1px solid #e0e0e0',
              marginLeft: msg.role === 'user' ? 'auto' : undefined,
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            maxWidth: '85%', background: 'white',
            color: '#999', border: '1px solid #e0e0e0', fontSize: 12,
          }}>
            응답을 기다리는 중...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: 10, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="질문을 입력하세요..."
          disabled={loading}
          style={{
            flex: 1, padding: 10, border: '1px solid #ddd',
            borderRadius: 6, fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: '10px 15px', background: loading ? '#9ca3af' : '#667eea',
            color: 'white', border: 'none', borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
