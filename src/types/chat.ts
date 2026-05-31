export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationSummary {
  id: string;
  model: string;
  createdAt: string;
  messageCount: number;
}
