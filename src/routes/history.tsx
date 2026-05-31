import { createFileRoute } from '@tanstack/react-router';
import { useConversations } from '../hooks/useConversations';
import { ConversationCard } from '../components/ConversationCard';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

function HistoryPage() {
  const {
    conversations,
    loading,
    error,
    selectedId,
    messagesCache,
    messagesLoading,
    loadConversations,
    toggle,
    handleDelete,
  } = useConversations();

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
        {conversations.map((conv) => (
          <ConversationCard
            key={conv.id}
            conversation={conv}
            isOpen={selectedId === conv.id}
            messages={messagesCache[conv.id]}
            messagesLoading={messagesLoading}
            onToggle={toggle}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </main>
  );
}
