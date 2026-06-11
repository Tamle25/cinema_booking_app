'use client';

import { Fragment, memo, useMemo } from 'react';

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

interface MovieCardBlock {
  posterUrl?: string;
  title: string;
  titleUrl?: string;
  genreText: string;
  durationText: string;
  nextIndex: number;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isKnownInternalLink(url: string): boolean {
  if (!url.startsWith('/') || url.startsWith('//')) return false;

  return (
    url === '/' ||
    url === '/movies' ||
    /^\/movies\?status=(now_showing|coming_soon)$/.test(url) ||
    /^\/movie\/[a-zA-Z0-9_-]+$/.test(url) ||
    url === '/booking' ||
    /^\/booking\/[a-zA-Z0-9_-]+$/.test(url) ||
    url === '/login' ||
    /^\/login\?redirect=%2F[a-zA-Z0-9_%.-]+$/.test(url) ||
    url === '/register' ||
    url === '/profile' ||
    url === '/my-tickets' ||
    url === '/news' ||
    /^\/news\/[a-zA-Z0-9_-]+$/.test(url)
  );
}

function labelForUrl(url: string): string {
  if (url.startsWith('/movie/')) return 'Xem chi tiết phim';
  if (url.startsWith('/booking/')) return 'Đặt vé';
  if (url.startsWith('/movies')) return 'Xem danh sách phim';
  if (url === '/booking') return 'Xem lịch chiếu';
  if (url.startsWith('/login')) return 'Đăng nhập';
  if (url === '/register') return 'Đăng ký';
  if (url === '/profile') return 'Trang cá nhân';
  if (url === '/my-tickets') return 'Vé của tôi';
  if (url.startsWith('/news')) return 'Xem tin tức';
  return 'Mở trang';
}

function isSafeImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('/');
}

function unescapeMarkdownText(text: string): string {
  return text.replace(/\\([\\[\]()!*_`])/g, '$1');
}

function parsePosterLine(line: string): string | null {
  const match = line.match(/^!\[[^\]]*]\(([^)]+)\)$/);
  if (!match || !isSafeImageUrl(match[1])) return null;
  return match[1];
}

function parseMovieTitleLine(line: string): { title: string; url?: string } | null {
  const withoutIndex = line.replace(/^\*\*\d+\.\*\*\s*/, '').trim();
  const linkMatch = withoutIndex.match(/^\[([^\]]+)]\(([^)]+)\)$/);

  if (linkMatch) {
    return {
      title: unescapeMarkdownText(linkMatch[1]),
      url: isKnownInternalLink(linkMatch[2]) ? linkMatch[2] : undefined,
    };
  }

  const boldMatch = withoutIndex.match(/^\*\*(.+)\*\*$/);
  const title = unescapeMarkdownText((boldMatch?.[1] || withoutIndex).trim());
  return title ? { title } : null;
}

function parseMovieCardBlock(lines: string[], startIndex: number): MovieCardBlock | null {
  let index = startIndex;
  let posterUrl: string | undefined;
  const firstLine = lines[index]?.trim() || '';
  const parsedPoster = parsePosterLine(firstLine);

  if (parsedPoster) {
    posterUrl = parsedPoster;
    index++;
  }

  const titleLine = lines[index]?.trim() || '';
  const parsedTitle = parseMovieTitleLine(titleLine);
  if (!parsedTitle) return null;
  index++;

  while (lines[index]?.trim() === '') {
    index++;
  }

  const genreLine = lines[index]?.trim() || '';
  const durationLine = lines[index + 1]?.trim() || '';

  if (!genreLine.startsWith('Thể loại:') || !durationLine.startsWith('Thời lượng:')) {
    return null;
  }

  return {
    posterUrl,
    title: parsedTitle.title,
    titleUrl: parsedTitle.url,
    genreText: genreLine,
    durationText: durationLine,
    nextIndex: index + 2,
  };
}

function renderMarkdown(
  text: string,
  onActionClick?: (url: string) => void,
): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmedLine = line.trim();
    const movieCard = parseMovieCardBlock(lines, index);

    if (movieCard) {
      result.push(renderMovieCard(movieCard, onActionClick, `movie-${index}`));
      index = movieCard.nextIndex;
      continue;
    }

    if (trimmedLine === '') {
      result.push(<br key={`br-${index}`} />);
      index++;
      continue;
    }

    const unordered = /^[-*]\s+/.test(trimmedLine);
    const ordered = /^\d+\.\s+/.test(trimmedLine);

    if (unordered || ordered) {
      const items: string[] = [];
      const listStart = index;
      const pattern = unordered ? /^[-*]\s+/ : /^\d+\.\s+/;

      while (index < lines.length && pattern.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(pattern, ''));
        index++;
      }

      const children = items.map((item, itemIndex) => (
        <li key={`${listStart}-${itemIndex}`}>{renderInline(item, onActionClick, `${listStart}-${itemIndex}`)}</li>
      ));

      result.push(
        unordered ? (
          <ul key={`ul-${listStart}`}>{children}</ul>
        ) : (
          <ol key={`ol-${listStart}`}>{children}</ol>
        ),
      );
      continue;
    }

    result.push(
      <p key={`p-${index}`}>{renderInline(trimmedLine, onActionClick, `p-${index}`)}</p>,
    );
    index++;
  }

  return result;
}

function renderMovieCard(
  movie: MovieCardBlock,
  onActionClick: ((url: string) => void) | undefined,
  key: string,
): React.ReactNode {
  const titleUrl = movie.titleUrl;

  return (
    <div key={key} className="chat-msg__movie-card">
      {movie.posterUrl && (
        <span
          role="img"
          aria-label={`Poster phim ${movie.title}`}
          className="chat-msg__movie-poster"
          style={{ backgroundImage: `url("${movie.posterUrl.replace(/"/g, '%22')}")` }}
        />
      )}
      <div className="chat-msg__movie-info">
        {titleUrl ? (
          <a
            href={titleUrl}
            className="chat-msg__movie-title chat-msg__link"
            onClick={(event) => {
              event.preventDefault();
              onActionClick?.(titleUrl);
            }}
          >
            {movie.title}
          </a>
        ) : (
          <span className="chat-msg__movie-title">{movie.title}</span>
        )}
        <p className="chat-msg__movie-meta">{movie.genreText}</p>
        <p className="chat-msg__movie-meta">{movie.durationText}</p>
      </div>
    </div>
  );
}

function renderInline(
  text: string,
  onActionClick: ((url: string) => void) | undefined,
  keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenPattern = /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))|(\*\*(.+?)\*\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...renderPlainText(text.slice(lastIndex, match.index), onActionClick, `${keyPrefix}-${nodes.length}`));
    }

    if (match[2] !== undefined && match[3]) {
      nodes.push(renderImage(match[2] || 'Poster phim', match[3], `${keyPrefix}-image-${match.index}`));
    } else if (match[5] && match[6]) {
      const label = match[5];
      const url = match[6];
      nodes.push(renderLink(label, url, onActionClick, `${keyPrefix}-link-${match.index}`));
    } else if (match[8]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${match.index}`}>{renderInline(match[8], onActionClick, `${keyPrefix}-strong-${match.index}`)}</strong>);
    } else if (match[10]) {
      nodes.push(<code key={`${keyPrefix}-code-${match.index}`}>{match[10]}</code>);
    }

    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(...renderPlainText(text.slice(lastIndex), onActionClick, `${keyPrefix}-${nodes.length}`));
  }

  return nodes;
}

function renderImage(alt: string, url: string, key: string): React.ReactNode {
  if (!isSafeImageUrl(url)) return null;

  return (
    <span
      key={key}
      role="img"
      aria-label={alt}
      className="chat-msg__poster"
      style={{ backgroundImage: `url("${url.replace(/"/g, '%22')}")` }}
    />
  );
}

function renderPlainText(
  text: string,
  onActionClick: ((url: string) => void) | undefined,
  keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const urlPattern = /((?:\/movie\/[a-zA-Z0-9_-]+)|(?:\/booking\/[a-zA-Z0-9_-]+)|(?:\/movies(?:\?status=(?:now_showing|coming_soon))?)|(?:\/booking)|(?:\/login(?:\?redirect=%2F[a-zA-Z0-9_%.-]+)?)|(?:\/register)|(?:\/profile)|(?:\/my-tickets)|(?:\/news(?:\/[a-zA-Z0-9_-]+)?))(?![)\w/?-])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`${keyPrefix}-text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    const url = match[1];
    nodes.push(renderLink(labelForUrl(url), url, onActionClick, `${keyPrefix}-auto-${match.index}`));
    lastIndex = urlPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-text-end`}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}

function renderLink(
  label: string,
  url: string,
  onActionClick: ((url: string) => void) | undefined,
  key: string,
): React.ReactNode {
  if (!isKnownInternalLink(url)) {
    return <Fragment key={key}>{label}</Fragment>;
  }

  return (
    <a
      key={key}
      href={url}
      className="chat-msg__link"
      onClick={(event) => {
        event.preventDefault();
        onActionClick?.(url);
      }}
    >
      {label}
    </a>
  );
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
    return renderMarkdown(message.content, onActionClick);
  }, [isUser, message.content, onActionClick]);

  return (
    <div
      className={`chat-msg chat-msg--${isUser ? 'user' : 'bot'}${message.isError ? ' chat-msg--error' : ''}${isFallback ? ' chat-msg--fallback' : ''}`}
    >
      <div className="chat-msg__bubble"
      >
        {isUser ? message.content : renderedContent}
      </div>
      {!isUser && message.actions && message.actions.length > 0 && (
        <div className="chat-msg__actions">
          {message.actions
            .filter((act) => isKnownInternalLink(act.url))
            .map((act, index) => (
              <button
                key={`${act.url}-${index}`}
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
