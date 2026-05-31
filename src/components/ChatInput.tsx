import { useRef, useEffect, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  model: string | null;
}

export function ChatInput({ value, onChange, onSend, disabled, model }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <footer className="input-bar">
      {model && <span className="input-model">{model}</span>}
      <textarea
        ref={textareaRef}
        className="input"
        placeholder="Message Gemma… (Enter to send, Shift+Enter for newline)"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          adjustHeight();
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button className="send-btn" onClick={onSend} disabled={disabled || !value.trim()}>
        Send
      </button>
    </footer>
  );
}
