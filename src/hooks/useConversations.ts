import { useState, useEffect, useCallback } from 'react';
import type { MouseEvent } from 'react';
import type { ConversationSummary, Message } from '../types/chat';
import {
  fetchConversations,
  fetchConversationMessages,
  deleteConversation,
} from '../api/chatApi';

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
  const [messagesLoading, setMessagesLoading] = useState(false);

  const loadConversations = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchConversations()
      .then(setConversations)
      .catch((err: unknown) => {
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        setError(
          isTimeout
            ? 'Request timed out. Please try again.'
            : 'Failed to load history. Is the backend running?',
        );
      })
      .finally(() => setLoading(false));
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
    try {
      const data = await fetchConversationMessages(id);
      setMessagesCache((prev) => ({ ...prev, [id]: data }));
    } catch {
      setMessagesCache((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleDelete = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
      setMessagesCache((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      alert('Failed to delete conversation.');
    }
  };

  return {
    conversations,
    loading,
    error,
    selectedId,
    messagesCache,
    messagesLoading,
    loadConversations,
    toggle,
    handleDelete,
  };
}
