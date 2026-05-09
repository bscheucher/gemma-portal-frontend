import { useState, useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: ChatPage,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error('Request failed');

      const data: { response: string; model: string } = await res.json();
      setModel(data.model);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: could not reach the backend.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <main className="messages">
        {messages.length === 0 && !loading && (
          <div className="empty">Send a message to start chatting.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <span className="bubble-label">{m.role === 'user' ? 'You' : 'Gemma'}</span>
            <p>{m.content}</p>
          </div>
        ))}
        {loading && (
          <div className="bubble assistant">
            <span className="bubble-label">Gemma</span>
            <p className="thinking">Thinking…</p>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="input-bar">
        {model && <span className="input-model">{model}</span>}
        <textarea
          className="input"
          rows={1}
          placeholder="Message Gemma… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
