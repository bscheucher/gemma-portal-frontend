import { useState, useEffect, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

interface ConversationSummary {
  id: string;
  model: string;
  createdAt: string;
  messageCount: number;
}

interface ChatMessage {
  role: string;
  content: string;
}

function makeTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messagesCache, setMessagesCache] = useState<Record<string, ChatMessage[]>>({});
  const [messagesLoading, setMessagesLoading] = useState(false);

  const loadConversations = useCallback(() => {
    setLoading(true);
    setError(null);
    const { signal, clear } = makeTimeoutSignal(30_000);
    fetch('/api/conversations', { signal })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((data: ConversationSummary[]) => setConversations(data))
      .catch((err) => {
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        setError(
          isTimeout
            ? 'Request timed out. Please try again.'
            : 'Failed to load history. Is the backend running?',
        );
      })
      .finally(() => {
        clear();
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const toggle = async (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);

    if (messagesCache[id]) return;

    setMessagesLoading(true);
    const { signal, clear } = makeTimeoutSignal(30_000);
    try {
      const r = await fetch(`/api/conversations/${id}/messages`, { signal });
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data: ChatMessage[] = await r.json();
      setMessagesCache((prev) => ({ ...prev, [id]: data }));
    } catch {
      setMessagesCache((prev) => ({ ...prev, [id]: [] }));
    } finally {
      clear();
      setMessagesLoading(false);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    const { signal, clear } = makeTimeoutSignal(30_000);
    try {
      const r = await fetch(`/api/conversations/${id}`, { method: 'DELETE', signal });
      if (!r.ok) throw new Error(`status ${r.status}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
      setMessagesCache((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      alert('Failed to delete conversation.');
    } finally {
      clear();
    }
  };

  return (
    <main className="messages">
      <div className="history-toolbar">
        <span className="history-count">
          {loading
            ? 'Loading…'
            : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="retry-btn" onClick={loadConversations}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <div className="empty">No conversations yet. Start chatting!</div>
      )}

      <div className="conv-list">
        {conversations.map((conv) => {
          const isOpen = selectedId === conv.id;
          const cachedMessages = messagesCache[conv.id];

          return (
            <div key={conv.id} className={`conv-card${isOpen ? ' active' : ''}`}>
              <div className="conv-header" onClick={() => toggle(conv.id)}>
                <span className={`conv-chevron${isOpen ? ' open' : ''}`}>›</span>
                <div className="conv-meta">
                  <span className="conv-model-tag">{conv.model}</span>
                  <span className="conv-sep">·</span>
                  <span className="conv-time">{formatDate(conv.createdAt)}</span>
                  <span className="conv-sep">·</span>
                  <span className="conv-count">
                    {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  className="conv-delete-btn"
                  onClick={(e) => deleteConversation(e, conv.id)}
                  title="Delete conversation"
                >
                  Delete
                </button>
              </div>

              {isOpen && (
                <div className="conv-messages">
                  {messagesLoading && !cachedMessages ? (
                    <div className="conv-messages-loading">Loading messages…</div>
                  ) : cachedMessages && cachedMessages.length === 0 ? (
                    <div className="conv-messages-empty">No messages in this conversation.</div>
                  ) : (
                    cachedMessages?.map((m, i) => (
                      <div
                        key={i}
                        className={`bubble ${m.role === 'user' ? 'user' : 'assistant'}`}
                      >
                        <span className="bubble-label">{m.role === 'user' ? 'You' : 'Gemma'}</span>
                        <p>{m.content}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}