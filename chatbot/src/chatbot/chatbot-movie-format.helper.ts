import { buildMarkdownLink, buildMovieDetailUrl, getEntityId } from './chatbot-link.helper';

export const MOVIE_LIST_DISPLAY_LIMIT = 8;

type MovieFieldValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];

function isRecord(value: unknown): value is Record<string, MovieFieldValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringField(record: Record<string, MovieFieldValue>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function isSafeImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('/');
}

function escapeMarkdownText(text: string): string {
  return text.replace(/([\\[\]()!*_`])/g, '\\$1');
}

function getMovieTitle(movie: unknown): string {
  if (!isRecord(movie)) return 'Chưa có tên';
  return readStringField(movie, ['title', 'name']) || 'Chưa có tên';
}

function getPosterUrl(movie: unknown): string | null {
  if (!isRecord(movie)) return null;
  const posterUrl = readStringField(movie, ['poster_url', 'poster', 'posterUrl', 'image_url', 'image']);
  if (!posterUrl || !isSafeImageUrl(posterUrl)) return null;
  return posterUrl;
}

function getGenreNames(movie: unknown): string {
  if (!isRecord(movie)) return 'Đang cập nhật';

  const genres = movie.genres;
  if (Array.isArray(genres)) {
    const names = genres
      .map((genre) => {
        if (typeof genre === 'string') return genre.trim();
        if (isRecord(genre)) return readStringField(genre, ['name', 'title']) || '';
        return '';
      })
      .filter(Boolean);

    if (names.length > 0) return names.join(', ');
  }

  const genreText = readStringField(movie, ['genre']);
  return genreText || 'Đang cập nhật';
}

function getDurationText(movie: unknown): string {
  if (!isRecord(movie)) return 'Đang cập nhật';
  const duration = movie.duration;

  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return `${duration} phút`;
  }

  if (typeof duration === 'string' && duration.trim()) {
    const normalized = duration.trim();
    return /\bphút\b/i.test(normalized) ? normalized : `${normalized} phút`;
  }

  return 'Đang cập nhật';
}

export function formatMovieMarkdown(movie: unknown, index?: number): string {
  const title = getMovieTitle(movie);
  const posterUrl = getPosterUrl(movie);
  const detailUrl = buildMovieDetailUrl(getEntityId(movie));
  const titleText = escapeMarkdownText(title);
  const titleLine = buildMarkdownLink(titleText, detailUrl) || `**${titleText}**`;
  const prefix = typeof index === 'number' ? `**${index + 1}.** ` : '';
  const lines: string[] = [];

  if (posterUrl) {
    lines.push(`![Poster phim](${posterUrl})`);
  }

  lines.push(`${prefix}${titleLine}`);
  lines.push('');
  lines.push(`Thể loại: ${getGenreNames(movie)}`);
  lines.push(`Thời lượng: ${getDurationText(movie)}`);

  return lines.join('\n');
}

export function formatMovieListMarkdown(data: unknown, type: string): string | null {
  if (!Array.isArray(data) || data.length === 0) {
    return `Hiện tại mình chưa tìm thấy phim ${type} nào trong hệ thống.`;
  }

  const movies = data.slice(0, MOVIE_LIST_DISPLAY_LIMIT);
  const movieBlocks = movies.map((movie, index) => formatMovieMarkdown(movie, index));
  let reply = `Phim ${type}:\n\n${movieBlocks.join('\n\n')}`;

  if (data.length > MOVIE_LIST_DISPLAY_LIMIT) {
    reply += `\n\n...và ${data.length - MOVIE_LIST_DISPLAY_LIMIT} phim khác.`;
  }

  reply += '\n\nBạn muốn xem lịch chiếu phim nào?';
  return reply;
}
