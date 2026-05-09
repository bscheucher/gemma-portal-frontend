import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

interface ChatMessage {
  role: string;
  content: string;
}

function HistoryPage() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/chat/history')
      .then((r) => r.json())
      .then((data: ChatMessage[]) => setHistory(data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const clearHistory = async () => {
    await fetch('/api/chat/history', { method: 'DELETE' });
    setHistory([]);
  };

  return (
    <main className="messages">
      <div className="history-toolbar">
        <span className="history-count">
          {loading ? 'Loading…' : `${history.length} message${history.length !== 1 ? 's' : ''}`}
        </span>
        <button className="clear-btn" onClick={clearHistory} disabled={history.length === 0}>
          Clear history
        </button>
      </div>

      {!loading && history.length === 0 && (
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
