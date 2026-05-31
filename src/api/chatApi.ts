import { makeTimeoutSignal } from '../utils/timeout';
import type { Message, ConversationSummary } from '../types/chat';

export async function fetchSessionHistory(): Promise<Message[]> {
  const { signal, clear } = makeTimeoutSignal(30_000);
  try {
    const r = await fetch('/api/chat/history', { signal });
    if (!r.ok) return [];
    const data: Message[] = await r.json();
    return data.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  } catch {
    return [];
  } finally {
    clear();
  }
}

type StreamEvent = { type: 'token'; value: string } | { type: 'model'; value: string };

export async function* streamChat(
  message: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok) throw new Error(`status ${res.status}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const dataStr = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
        const parsed: string | { model: string } = JSON.parse(dataStr);

        if (parsed === '[DONE]') return;
        if (typeof parsed === 'object') {
          yield { type: 'model', value: parsed.model };
        } else {
          yield { type: 'token', value: parsed };
        }
      }
    }
  } finally {
    reader.cancel();
  }
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const { signal, clear } = makeTimeoutSignal(30_000);
  try {
    const r = await fetch('/api/conversations', { signal });
    if (!r.ok) throw new Error(`status ${r.status}`);
    return r.json();
  } finally {
    clear();
  }
}

export async function fetchConversationMessages(id: string): Promise<Message[]> {
  const { signal, clear } = makeTimeoutSignal(30_000);
  try {
    const r = await fetch(`/api/conversations/${id}/messages`, { signal });
    if (!r.ok) throw new Error(`status ${r.status}`);
    return r.json();
  } finally {
    clear();
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const { signal, clear } = makeTimeoutSignal(30_000);
  try {
    const r = await fetch(`/api/conversations/${id}`, { method: 'DELETE', signal });
    if (!r.ok) throw new Error(`status ${r.status}`);
  } finally {
    clear();
  }
}
