import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

interface ChatMessage {
  role: string;
  content: string;
}

function makeTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

function HistoryPage() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const { signal, clear } = makeTimeoutSignal(30_000);
    fetch('/api/chat/history', { signal })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((data: ChatMessage[]) => setHistory(data))
      .catch((err) => {
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        setError(
          isTimeout
            ? 'Request timed out. Please try again.'
            : 'Failed to load history. Is the backend running?'
        );
      })
      .finally(() => {
        clear();
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const clearHistory = async () => {
    if (!window.confirm('Clear all conversation history? This cannot be undone.')) return;
    const { signal, clear } = makeTimeoutSignal(30_000);
    try {
      const res = await fetch('/api/chat/history', { method: 'DELETE', signal });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setHistory([]);
    } catch {
      setError('Failed to clear history. Please try again.');
    } finally {
      clear();
    }
  };

  return (
    <main className="messages">
      <div className="history-toolbar">
        <span className="history-count">
          {loading ? 'Loading…' : `${history.length} message${history.length !== 1 ? 's' : ''}`}
        </span>
        <button className="clear-btn" onClick={clearHistory} disabled={loading || history.length === 0}>
          Clear history
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="empty">No conversation history yet.</div>
      )}

      {history.map((m, i) => (
        <div key={i} className={`bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
          <span className="bubble-label">{m.role === 'user' ? 'You' : 'Gemma'}</span>
          <p>{m.content}</p>
        </div>
      ))}
    </main>
  );
}