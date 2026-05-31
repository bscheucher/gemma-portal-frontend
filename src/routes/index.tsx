import { createFileRoute } from '@tanstack/react-router';
import { useChatSession } from '../hooks/useChatSession';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';

export const Route = createFileRoute('/')({
  component: ChatPage,
});

function ChatPage() {
  const { messages, input, setInput, loading, model, initializing, bottomRef, send } =
    useChatSession();

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
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            isStreaming={loading && m.role === 'assistant' && i === messages.length - 1}
          />
        ))}
        <div ref={bottomRef} />
      </main>
      <ChatInput value={input} onChange={setInput} onSend={send} disabled={loading} model={model} />
    </>
  );
}
