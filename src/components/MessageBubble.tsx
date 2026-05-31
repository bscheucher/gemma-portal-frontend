import type { Message } from '../types/chat';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: Props) {
  const isThinking = isStreaming && message.content === '';
  return (
    <div className={`bubble ${message.role}`}>
      <span className="bubble-label">{message.role === 'user' ? 'You' : 'Gemma'}</span>
      <p className={isThinking ? 'thinking' : undefined}>
        {message.content || (isStreaming ? '…' : '')}
      </p>
    </div>
  );
}
