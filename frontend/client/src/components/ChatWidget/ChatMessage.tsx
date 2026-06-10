'use client';

import { memo, useMemo } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  source?: 'gemini' | 'fallback' | 'rule';
  errorCode?: string;
  actions?: { type: string; label: string; url: string }[];
}

interface ChatMessageProps {
  message: Message;
  onActionClick?: (url: string) => void;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (/^[-*]\s+/.test(trimmedLine)) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      const content = trimmedLine.replace(/^[-*]\s+/, '');
      result.push(`<li>${formatInline(content)}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmedLine)) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      const content = trimmedLine.replace(/^\d+\.\s+/, '');
      result.push(`<li>${formatInline(content)}</li>`);
      continue;
    }

    if (inList) {
      result.push(`</${listType}>`);
      inList = false;
      listType = null;
    }

    if (trimmedLine === '') {
      result.push('<br/>');
      continue;
    }

    result.push(`<p>${formatInline(trimmedLine)}</p>`);
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join('');
}

function formatInline(text: string): string {
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return safe;
}

function isFallbackMessage(message: Message): boolean {
  if (message.source === 'fallback') return true;
  if (message.errorCode === 'QUOTA_EXCEEDED') return true;
  if (message.errorCode === 'RATE_LIMITED') return true;
  return false;
}

const ChatMessage = memo(function ChatMessage({ message, onActionClick }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isFallback = !isUser && isFallbackMessage(message);

  const renderedContent = useMemo(() => {
    if (isUser) return null;
    return renderMarkdown(message.content);
  }, [isUser, message.content]);

  return (
    <div
      className={`chat-msg chat-msg--${isUser ? 'user' : 'bot'}${message.isError ? ' chat-msg--error' : ''}${isFallback ? ' chat-msg--fallback' : ''}`}
    >
      <div className="chat-msg__bubble"
        {...(isUser
          ? { children: message.content }
          : { dangerouslySetInnerHTML: { __html: renderedContent || '' } }
        )}
      />
      {!isUser && message.actions && message.actions.length > 0 && (
        <div className="chat-msg__actions">
          {message.actions.map((act, index) => (
            <button
              key={index}
              className="chat-msg__cta-btn"
              onClick={() => onActionClick && onActionClick(act.url)}
            >
              {act.label}
            </button>
          ))}
        </div>
      )}
      <span className="chat-msg__time">
        {formatTime(message.timestamp)}
        {isFallback && ' · Phản hồi tự động'}
      </span>
    </div>
  );
});

export default ChatMessage;
