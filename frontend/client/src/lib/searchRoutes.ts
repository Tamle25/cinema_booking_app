export interface SearchGenreRouteInput {
  _id?: string;
  name?: string;
  slug?: string;
}

export const buildMovieDetailUrl = (movieId: string): string | null => {
  const trimmedId = movieId.trim();
  return trimmedId ? `/movie/${encodeURIComponent(trimmedId)}` : null;
};

export const buildMoviesByGenreUrl = (
  genre: SearchGenreRouteInput,
): string | null => {
  const genreId = genre._id?.trim();
  if (!genreId) return null;

  const params = new URLSearchParams({ genre: genreId });
  return `/movies?${params.toString()}`;
};

export const buildMoviesSearchUrl = (keyword: string): string | null => {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return null;

  const params = new URLSearchParams({ search: trimmedKeyword });
  return `/movies?${params.toString()}`;
};

export const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
