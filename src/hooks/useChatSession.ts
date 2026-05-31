import { useState, useEffect, useRef } from 'react';
import type { Message } from '../types/chat';
import { fetchSessionHistory, streamChat } from '../api/chatApi';
import { makeTimeoutSignal } from '../utils/timeout';

export function useChatSession() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessionHistory()
      .then(setMessages)
      .finally(() => setInitializing(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const appendToLastMsg = (token: string) =>
    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        role: 'assistant',
        content: updated[updated.length - 1].content + token,
      };
      return updated;
    });

  const replaceLastMsg = (content: string) =>
    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: 'assistant', content };
      return updated;
    });

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ]);

    const { signal, clear } = makeTimeoutSignal(120_000);
    try {
      for await (const event of streamChat(text, signal)) {
        if (event.type === 'token') appendToLastMsg(event.value);
        else setModel(event.value);
      }
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      replaceLastMsg(
        isTimeout
          ? 'Request timed out — the model may be loading. Please try again.'
          : 'Could not reach the backend. Is it running?',
      );
    } finally {
      clear();
      setLoading(false);
    }
  };

  return { messages, input, setInput, loading, model, initializing, bottomRef, send };
}
