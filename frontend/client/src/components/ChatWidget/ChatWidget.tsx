'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import ChatMessage from './ChatMessage';
import './ChatWidget.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** True nếu message này là lỗi (hiển thị khác) */
  isError?: boolean;
  /** Nguồn xử lý: gemini, rule, fallback */
  source?: 'gemini' | 'fallback' | 'rule';
  /** Mã lỗi nếu có */
  errorCode?: string;
}

const SUGGESTIONS = [
  'Hôm nay có phim gì?',
  'Phim sắp chiếu?',
  'Xem lịch chiếu',
  'Combo bắp nước?',
  'Hướng dẫn đặt vé',
];

const CHATBOT_API_URL =
  process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:5005';

/** Timeout cho fetch request tới chatbot API (ms) */
const FETCH_TIMEOUT_MS = 35_000;

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll khi có tin nhắn mới
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isLoading, scrollToBottom]);

  // Scroll tức thì khi vừa mở panel
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollToBottom('auto');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToBottom]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsOpening(true);
    setIsClosing(false);
    setUnread(0);
    // Gỡ class opening sau khi kết thúc animation (280ms)
    setTimeout(() => {
      setIsOpening(false);
    }, 300);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Thêm tin nhắn user
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'; // Reset lại chiều cao textarea
    }
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Tạo AbortController cho timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(`${CHATBOT_API_URL}/api/chatbot/message`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: trimmed,
            userId: user?._id || user?.id || undefined,
            isAuthenticated: !!user,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Kiểm tra HTTP status trước khi parse JSON
      if (!res.ok) {
        // Cố gắng parse response body (có thể chứa structured error từ guard)
        try {
          const errorData = await res.json();
          if (errorData?.reply) {
            addBotMessage(errorData.reply, true, errorData.source, errorData.errorCode);
            return;
          }
        } catch {
          // Không parse được JSON → dùng message mặc định
        }

        const errorReply = getHttpErrorMessage(res.status);
        addBotMessage(errorReply, true);
        return;
      }

      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Xin lỗi, tôi không thể xử lý câu hỏi này.',
        timestamp: new Date(),
        isError: data.success === false,
        source: data.source,
        errorCode: data.errorCode,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Nếu panel đóng, tăng unread
      if (!isOpen) {
        setUnread((prev) => prev + 1);
      }
    } catch (error: unknown) {
      let errorContent: string;

      if (error instanceof DOMException && error.name === 'AbortError') {
        // Timeout
        errorContent = 'Hệ thống phản hồi chậm hơn bình thường. Vui lòng thử lại. ⏱️';
      } else if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed'))) {
        // Network error / CORS error
        errorContent = 'Không thể kết nối đến chatbot. Vui lòng kiểm tra lại kết nối mạng. 🌐';
      } else {
        errorContent = 'Xin lỗi, không thể kết nối đến chatbot. Vui lòng thử lại sau. 🙏';
      }

      addBotMessage(errorContent, true);
    } finally {
      setIsLoading(false);
    }
  };

  /** Helper: thêm bot message vào danh sách */
  const addBotMessage = (
    content: string,
    isError = false,
    source?: 'gemini' | 'fallback' | 'rule',
    errorCode?: string,
  ) => {
    const msg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      isError,
      source,
      errorCode,
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 100)}px`;
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="chatbot-fab"
        className={`chat-fab ${isOpen ? 'chat-fab--open' : ''}`}
        onClick={isOpen ? handleClose : handleOpen}
        aria-label={isOpen ? 'Đóng chat' : 'Mở chat hỗ trợ'}
      >
        {!isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
        {unread > 0 && !isOpen && (
          <span className="chat-fab__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          id="chatbot-panel"
          className={`chat-panel ${isOpening ? 'chat-panel--opening' : ''} ${isClosing ? 'chat-panel--closing' : ''}`}
        >
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header__info">
              <div className="chat-header__avatar">🤖</div>
              <div className="chat-header__text">
                <h3>CineMax Bot</h3>
                <p>Hỗ trợ đặt vé xem phim</p>
              </div>
            </div>
            <div className="chat-header__actions">
              <button
                className="chat-header__btn"
                onClick={handleClearChat}
                title="Xóa hội thoại"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <button
                className="chat-header__btn"
                onClick={handleClose}
                title="Đóng"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" ref={messagesContainerRef}>
            {messages.length === 0 && !isLoading ? (
              <div className="chat-welcome">
                <div className="chat-welcome__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h4>Xin chào! 👋</h4>
                <p>
                  Tôi là trợ lý CineMax. Tôi có thể giúp bạn tìm phim, xem
                  lịch chiếu, đặt vé và nhiều hơn nữa!
                </p>
                <div className="chat-welcome__suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className="chat-welcome__chip"
                      onClick={() => handleSuggestion(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {isLoading && (
                  <div className="chat-typing">
                    <div className="chat-typing__dot" />
                    <div className="chat-typing__dot" />
                    <div className="chat-typing__dot" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <form className="chat-input" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              id="chatbot-input"
              className="chat-input__field"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              disabled={isLoading}
              rows={1}
            />
            <button
              id="chatbot-send"
              type="submit"
              className="chat-input__send"
              disabled={!input.trim() || isLoading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/**
 * Trả message thân thiện dựa trên HTTP status code.
 * Không hiển thị stack trace, quotaMetric, hoặc raw error cho user.
 */
function getHttpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Tin nhắn không hợp lệ. Vui lòng thử lại. 📝';
    case 429:
      return 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ vài giây và thử lại. ⏳';
    case 500:
    case 502:
    case 503:
      return 'Hệ thống chatbot đang gặp sự cố. Vui lòng thử lại sau ít phút. 🔧';
    default:
      return 'Đã xảy ra lỗi. Vui lòng thử lại sau. 🙏';
  }
}
