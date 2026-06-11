const OBJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function cleanId(id?: unknown): string | null {
  if (typeof id !== 'string' && typeof id !== 'number') return null;
  const value = String(id).trim();
  if (!value || !OBJECT_ID_PATTERN.test(value)) return null;
  return encodeURIComponent(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function cleanRedirect(redirectTo?: string): string | null {
  if (!redirectTo || !isKnownChatbotRoute(redirectTo)) return null;
  return redirectTo;
}

export function getEntityId(entity: unknown): string | null {
  if (!entity) return null;
  if (typeof entity === 'string' || typeof entity === 'number') return cleanId(entity);
  if (!isRecord(entity)) return null;
  return cleanId(entity._id ?? entity.id);
}

export function buildHomeUrl(): string {
  return '/';
}

export function buildMovieListUrl(status?: 'now_showing' | 'coming_soon'): string {
  return status ? `/movies?status=${status}` : '/movies';
}

export function buildMovieDetailUrl(movieId?: unknown): string | null {
  const id = cleanId(movieId);
  return id ? `/movie/${id}` : null;
}

export function buildMovieScheduleUrl(movieId?: unknown): string | null {
  return buildMovieDetailUrl(movieId) || buildMovieListUrl('now_showing');
}

export function buildBookingUrl(showtimeId?: unknown): string | null {
  const id = cleanId(showtimeId);
  return id ? `/booking/${id}` : null;
}

export function buildShowtimeListUrl(): string {
  return '/booking';
}

export function buildLoginUrl(redirectTo?: string): string {
  const redirect = cleanRedirect(redirectTo);
  return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
}

export function buildRegisterUrl(): string {
  return '/register';
}

export function buildProfileUrl(): string {
  return '/profile';
}

export function buildMyTicketsUrl(): string {
  return '/my-tickets';
}

export function buildNewsUrl(): string {
  return '/news';
}

export function isKnownChatbotRoute(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('/')) return false;
  if (url.startsWith('//')) return false;

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

export function buildMarkdownLink(label: string, url?: string | null): string | null {
  if (!url || !isKnownChatbotRoute(url)) return null;
  return `[${label}](${url})`;
}

export function replaceRawKnownInternalUrls(reply: string): string {
  return reply.replace(
    /(^|[\s(])((?:\/movie\/[a-zA-Z0-9_-]+)|(?:\/booking\/[a-zA-Z0-9_-]+)|(?:\/movies(?:\?status=(?:now_showing|coming_soon))?)|(?:\/booking)|(?:\/login(?:\?redirect=%2F[a-zA-Z0-9_%.-]+)?)|(?:\/register)|(?:\/profile)|(?:\/my-tickets)|(?:\/news(?:\/[a-zA-Z0-9_-]+)?))(?![)\w/?-])/g,
    (match, prefix, url) => {
      if (prefix === '(') return match;
      const label = labelForUrl(url);
      return `${prefix}${buildMarkdownLink(label, url) || url}`;
    },
  );
}

export function removeUnknownInternalUrls(reply: string): string {
  return reply
    .replace(/\[([^\]]+)\]\((\/booking\?movieId=[^)]+|\/booking\/seats\?showtimeId=[^)]+|\/(?:showtimes?|schedule|cinema|cinemas|promotions|checkout|profile\/bookings)(?:\/[^)]*)?(?:\?[^)]*)?)\)/g, '$1')
    .replace(/(^|[\s(])\/booking\?movieId=[^\s)]+/g, '$1')
    .replace(/(^|[\s(])\/booking\/seats\?showtimeId=[^\s)]+/g, '$1')
    .replace(/(^|[\s(])\/(?:showtimes?|schedule|cinema|cinemas|promotions|checkout|profile\/bookings)(?:\/[^\s)]*)?(?:\?[^\s)]*)?/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeChatbotReplyLinks(reply: string): string {
  return replaceRawKnownInternalUrls(removeUnknownInternalUrls(reply));
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
