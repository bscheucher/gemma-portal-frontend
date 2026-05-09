import { useState, useEffect, useRef, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: ChatPage,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function makeTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Shrink textarea back to one row when input is cleared after send
  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  // Load session history from backend on mount
  useEffect(() => {
    const { signal, clear } = makeTimeoutSignal(30_000);
    fetch('/api/chat/history', { signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Message[]) =>
        setMessages(data.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })))
      )
      .catch(() => {})
      .finally(() => {
        clear();
        setInitializing(false);
      });
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
      { role: 'assistant', content: '' }, // streaming placeholder
    ]);

    const { signal, clear } = makeTimeoutSignal(120_000);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal,
      });

      if (!res.ok) throw new Error(`status ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let complete = false;

      while (!complete) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!; // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          // Backend sends either a JSON string (token), "[DONE]", or {"model":"..."} object
          const parsed: string | { model: string } = JSON.parse(line.slice(6));

          if (typeof parsed === 'object') {
            setModel(parsed.model);
          } else if (parsed === '[DONE]') {
            complete = true;
            break;
          } else {
            appendToLastMsg(parsed);
          }
        }
      }

      reader.cancel();
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      replaceLastMsg(
        isTimeout
          ? 'Request timed out — the model may be loading. Please try again.'
          : 'Could not reach the backend. Is it running?'
      );
    } finally {
      clear();
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (initializing) {
    return (
      <main className="messages">
        <div className="empty">Loading…</div>
      </main>
    );
  }

  return (
    <>
      <main className="messages">
        {messages.length === 0 && !loading && (
          <div className="empty">Send a message to start chatting.</div>
        )}
        {messages.map((m, i) => {
          const isStreamingPlaceholder =
            loading && m.role === 'assistant' && i === messages.length - 1;
          return (
            <div key={i} className={`bubble ${m.role}`}>
              <span className="bubble-label">{m.role === 'user' ? 'You' : 'Gemma'}</span>
              <p className={isStreamingPlaceholder && m.content === '' ? 'thinking' : undefined}>
                {m.content || (isStreamingPlaceholder ? '…' : '')}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      <footer className="input-bar">
        {model && <span className="input-model">{model}</span>}
        <textarea
          ref={textareaRef}
          className="input"
          placeholder="Message Gemma… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
          Send
        </button>
      </footer>
    </>
  );
}