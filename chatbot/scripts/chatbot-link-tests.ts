import * as assert from 'node:assert/strict';
import { ChatbotService } from '../src/chatbot/chatbot.service';
import { ChatContext, ChatIntent, IntentResult, NavigationAction } from '../src/chatbot/types/chatbot.types';
import {
  buildBookingUrl,
  buildLoginUrl,
  buildMovieDetailUrl,
  buildMovieScheduleUrl,
  buildMyTicketsUrl,
  isKnownChatbotRoute,
  normalizeChatbotReplyLinks,
} from '../src/chatbot/chatbot-link.helper';
import {
  formatMovieListMarkdown,
  formatMovieMarkdown,
  MOVIE_LIST_DISPLAY_LIMIT,
} from '../src/chatbot/chatbot-movie-format.helper';

const RAW_VISIBLE_URL = /(^|\s)\/(?:movie|booking|profile\/bookings|checkout|promotions|schedule|cinema)(?:\/|\?|$)/;

interface ChatbotServiceTestApi {
  formatMovieDetail(data: unknown): string;
  formatShowtimes(data: unknown): string | null;
  updateContextAndGenerateActions(
    intentResult: IntentResult,
    backendData: unknown,
    context: ChatContext,
    actions: NavigationAction[],
    suggestions: string[],
  ): void;
}

function createService(): ChatbotServiceTestApi {
  return new ChatbotService({} as never, {} as never, {} as never) as unknown as ChatbotServiceTestApi;
}

function assertNoVisibleRawUrl(reply: string): void {
  assert.equal(RAW_VISIBLE_URL.test(reply), false, reply);
}

function assertActionRoutes(actions: Array<{ url: string }>): void {
  for (const action of actions) {
    assert.equal(isKnownChatbotRoute(action.url), true, `Invalid action route: ${action.url}`);
  }
}

function runRouteHelperTests(): void {
  assert.equal(buildMovieDetailUrl('6a299adc875684de29162d19'), '/movie/6a299adc875684de29162d19');
  assert.equal(buildMovieScheduleUrl('6a299adc875684de29162d19'), '/movie/6a299adc875684de29162d19');
  assert.equal(buildBookingUrl('showtime-1'), '/booking/showtime-1');
  assert.equal(buildBookingUrl(undefined), null);
  assert.equal(buildLoginUrl(buildMyTicketsUrl()), '/login?redirect=%2Fmy-tickets');

  const validRoutes = [
    '/movie/6a299adc875684de29162d19',
    '/movies',
    '/movies?status=now_showing',
    '/booking',
    '/booking/showtime-1',
    '/login',
    '/login?redirect=%2Fmy-tickets',
    '/register',
    '/profile',
    '/my-tickets',
    '/news',
  ];
  validRoutes.forEach((route) => assert.equal(isKnownChatbotRoute(route), true, route));

  const invalidRoutes = [
    '/booking?movieId=6a299adc875684de29162d19',
    '/booking/seats?showtimeId=showtime-1',
    '/profile/bookings',
    '/promotions',
    '/checkout',
    '/schedule',
    '/cinema/abc',
    'https://example.com/movie/1',
  ];
  invalidRoutes.forEach((route) => assert.equal(isKnownChatbotRoute(route), false, route));
}

function runTodayMoviesTests(): void {
  const movies = Array.from({ length: 9 }, (_, index) => ({
    _id: `movie-${index + 1}`,
    title: `Phim ${index + 1}`,
    poster_url: `https://image.example/movie-${index + 1}.jpg`,
    genres: [{ name: 'Hoạt hình' }, { name: 'Phiêu lưu' }],
    duration: 115,
  }));
  const reply = formatMovieListMarkdown(movies, 'đang chiếu') || '';

  assert.equal((reply.match(/\[Phim \d+\]\(\/movie\/movie-\d+\)/g) || []).length, MOVIE_LIST_DISPLAY_LIMIT);
  assert.match(reply, /!\[Poster phim\]\(https:\/\/image\.example\/movie-1\.jpg\)/);
  assert.match(reply, /\[Phim 1\]\(\/movie\/movie-1\)/);
  assert.match(reply, /Thể loại: Hoạt hình, Phiêu lưu/);
  assert.match(reply, /Thời lượng: 115 phút/);
  assert.match(reply, /\.\.\.và 1 phim khác/);
  assert.doesNotMatch(reply, /Xem chi tiết phim/);
  assert.doesNotMatch(reply, / - /);
  assertNoVisibleRawUrl(reply);
}

function runMissingMovieFieldTests(): void {
  const withoutPoster = formatMovieMarkdown({
    _id: 'movie-no-poster',
    title: 'Phim thiếu poster',
    genres: ['Tâm lý'],
    duration: 100,
  });
  assert.doesNotMatch(withoutPoster, /!\[Poster phim\]/);
  assert.match(withoutPoster, /\[Phim thiếu poster\]\(\/movie\/movie-no-poster\)/);

  const missingMeta = formatMovieMarkdown({
    _id: 'movie-missing-meta',
    title: 'Phim thiếu metadata',
  });
  assert.match(missingMeta, /Thể loại: Đang cập nhật/);
  assert.match(missingMeta, /Thời lượng: Đang cập nhật/);

  const missingId = formatMovieMarkdown({
    title: 'Phim thiếu id',
    genres: [{ name: 'Hài' }],
    duration: 90,
  });
  assert.match(missingId, /\*\*Phim thiếu id\*\*/);
  assert.doesNotMatch(missingId, /\]\(\/movie\//);
  assertNoVisibleRawUrl(missingId);
}

function runMovieDetailTests(): void {
  const service = createService();

  const foundReply = service.formatMovieDetail({
    _id: 'movie-2',
    title: 'Mai',
    genre: 'Tâm lý',
    duration: 130,
    trailer_url: 'https://video.example/trailer',
  });
  assert.match(foundReply, /\[Xem chi tiết phim\]\(\/movie\/movie-2\)/);
  assert.doesNotMatch(foundReply, /https:\/\/video\.example/);
  assertNoVisibleRawUrl(foundReply);

  const missingReply = service.formatMovieDetail(null);
  assert.match(missingReply, /chưa tìm thấy phim/);
  assertNoVisibleRawUrl(missingReply);
}

function runShowtimeAndBookingTests(): void {
  const service = createService();
  const reply = service.formatShowtimes([
    {
      _id: 'showtime-1',
      movie: { _id: 'movie-1', title: 'Doraemon' },
      cinema: { name: 'CineMax Quận 1' },
      start_time: new Date('2026-06-11T13:00:00+07:00').toISOString(),
    },
  ]);

  assert.ok(reply);
  assert.match(reply, /\[Đặt vé\]\(\/booking\/showtime-1\)/);
  assertNoVisibleRawUrl(reply);

  const actions: NavigationAction[] = [];
  service.updateContextAndGenerateActions(
    { intent: ChatIntent.SHOWTIMES },
    [
      {
        _id: 'showtime-1',
        movie: { _id: 'movie-1', title: 'Doraemon' },
        cinema: { _id: 'cinema-1', name: 'CineMax Quận 1' },
      },
    ],
    {},
    actions,
    [],
  );

  assert.deepEqual(actions.map((action) => action.url), ['/movie/movie-1', '/booking/showtime-1']);
  assertActionRoutes(actions);
}

function runUnknownRouteTests(): void {
  const normalized = normalizeChatbotReplyLinks(
    'Xem /movie/movie-1 hoặc /booking?movieId=movie-1, /booking/seats?showtimeId=showtime-1, /profile/bookings, /checkout, /promotions.',
  );

  assert.match(normalized, /\[Xem chi tiết phim\]\(\/movie\/movie-1\)/);
  assert.doesNotMatch(normalized, /\/booking\?movieId/);
  assert.doesNotMatch(normalized, /\/booking\/seats/);
  assert.doesNotMatch(normalized, /\/profile\/bookings/);
  assert.doesNotMatch(normalized, /\/checkout/);
  assert.doesNotMatch(normalized, /\/promotions/);

  const invalidMarkdown = normalizeChatbotReplyLinks(
    '[Đặt vé](/booking?movieId=movie-1) [Chọn ghế](/booking/seats?showtimeId=showtime-1) [Khuyến mãi](/promotions)',
  );
  assert.equal(invalidMarkdown, 'Đặt vé Chọn ghế Khuyến mãi');
}

runRouteHelperTests();
runTodayMoviesTests();
runMissingMovieFieldTests();
runMovieDetailTests();
runShowtimeAndBookingTests();
runUnknownRouteTests();

console.log('Chatbot link tests passed.');
