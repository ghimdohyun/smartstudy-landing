// Hook for chatbot state management

import { useState, useCallback } from 'react';
import type { ChatMessage } from '@/types';
import { fetchChatReply } from '@/lib/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'assistant', content: '안녕하세요! 무엇을 도와드릴까요?' },
  ]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (text: string, universityId?: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const reply = await fetchChatReply(text, universityId);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: `오류: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setMessages([{ id: 'init', role: 'assistant', content: '안녕하세요! 무엇을 도와드릴까요?' }]);
  }, []);

  return { messages, loading, send, reset };
}
