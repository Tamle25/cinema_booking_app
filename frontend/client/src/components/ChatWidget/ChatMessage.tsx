'use client';

import { memo, useMemo } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  /** Nguồn xử lý: gemini, rule, fallback */
  source?: 'gemini' | 'fallback' | 'rule';
  /** Mã lỗi nếu có */
  errorCode?: string;
}

interface ChatMessageProps {
  message: Message;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Render markdown cơ bản cho bot response:
 * - **bold** → <strong>
 * - Dòng bắt đầu bằng `- ` hoặc `* ` → bullet list
 * - Dòng bắt đầu bằng `1. `, `2. ` ... → numbered list
 * - Line breaks → <br>
 */
function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Bullet list item
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

    // Numbered list item
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

    // Kết thúc list nếu gặp dòng không phải list item
    if (inList) {
      result.push(`</${listType}>`);
      inList = false;
      listType = null;
    }

    // Dòng trống
    if (trimmedLine === '') {
      result.push('<br/>');
      continue;
    }

    // Dòng thường
    result.push(`<p>${formatInline(trimmedLine)}</p>`);
  }

  // Đóng list nếu kết thúc ở cuối
  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join('');
}

/** Format inline: **bold** */
function formatInline(text: string): string {
  // Escape HTML đặc biệt trước
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // **bold**
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return safe;
}

/**
 * Kiểm tra xem message có phải là fallback/warning hay không.
 * Nếu source = "fallback" hoặc errorCode = "QUOTA_EXCEEDED" → hiển thị khác.
 */
function isFallbackMessage(message: Message): boolean {
  if (message.source === 'fallback') return true;
  if (message.errorCode === 'QUOTA_EXCEEDED') return true;
  if (message.errorCode === 'RATE_LIMITED') return true;
  return false;
}

const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isFallback = !isUser && isFallbackMessage(message);

  // Chỉ render markdown cho bot messages
  const renderedContent = useMemo(() => {
    if (isUser) return null;
    return renderMarkdown(message.content);
  }, [isUser, message.content]);

  return (
    <div
      className={`chat-msg chat-msg--${isUser ? 'user' : 'bot'}${message.isError ? ' chat-msg--error' : ''}${isFallback ? ' chat-msg--fallback' : ''}`}
    >
      <div
        className="chat-msg__bubble"
        {...(isUser
          ? { children: message.content }
          : { dangerouslySetInnerHTML: { __html: renderedContent || '' } }
        )}
      />
      <span className="chat-msg__time">
        {formatTime(message.timestamp)}
        {isFallback && ' · ⚠️ Phản hồi tự động'}
      </span>
    </div>
  );
});

export default ChatMessage;
