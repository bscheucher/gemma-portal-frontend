import type { MouseEvent } from 'react';
import type { ConversationSummary, Message } from '../types/chat';
import { MessageBubble } from './MessageBubble';
import { formatDate } from '../utils/format';

interface Props {
  conversation: ConversationSummary;
  isOpen: boolean;
  messages: Message[] | undefined;
  messagesLoading: boolean;
  onToggle: (id: string) => void;
  onDelete: (e: MouseEvent, id: string) => void;
}

export function ConversationCard({
  conversation,
  isOpen,
  messages,
  messagesLoading,
  onToggle,
  onDelete,
}: Props) {
  return (
    <div className={`conv-card${isOpen ? ' active' : ''}`}>
      <div className="conv-header" onClick={() => onToggle(conversation.id)}>
        <span className={`conv-chevron${isOpen ? ' open' : ''}`}>›</span>
        <div className="conv-meta">
          <span className="conv-model-tag">{conversation.model}</span>
          <span className="conv-sep">·</span>
          <span className="conv-time">{formatDate(conversation.createdAt)}</span>
          <span className="conv-sep">·</span>
          <span className="conv-count">
            {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          className="conv-delete-btn"
          onClick={(e) => onDelete(e, conversation.id)}
          title="Delete conversation"
        >
          Delete
        </button>
      </div>

      {isOpen && (
        <div className="conv-messages">
          {messagesLoading && !messages ? (
            <div className="conv-messages-loading">Loading messages…</div>
          ) : messages && messages.length === 0 ? (
            <div className="conv-messages-empty">No messages in this conversation.</div>
          ) : (
            messages?.map((m, i) => <MessageBubble key={i} message={m} />)
          )}
        </div>
      )}
    </div>
  );
}
