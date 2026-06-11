'use client';

import SafeImage from '@/components/SafeImage';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MovieCard from '@/components/MovieCard';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';
import { normalizeSearchText } from '@/lib/searchRoutes';
import { IGenre } from '@/types';

type MovieStatusTab = 'all' | 'now_showing' | 'coming_soon';

interface Movie {
    _id: string;
    title: string;
    poster_url: string;
    duration: number;
    release_date: string;
    rating: number;
    genres?: IGenre[];
}

interface MovieTab {
    key: MovieStatusTab;
    label: string;
    count: number;
    color: 'red' | 'green' | 'yellow';
}

const ITEMS_PER_PAGE = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isGenre(value: unknown): value is IGenre {
    return isRecord(value) && typeof value._id === 'string' && typeof value.name === 'string';
}

function isMovie(value: unknown): value is Movie {
    return (
        isRecord(value) &&
        typeof value._id === 'string' &&
        typeof value.title === 'string' &&
        typeof value.poster_url === 'string' &&
        typeof value.duration === 'number' &&
        typeof value.release_date === 'string' &&
        typeof value.rating === 'number'
    );
}

function parseStatusParam(status: string): MovieStatusTab {
    return status === 'now_showing' || status === 'coming_soon' ? status : 'all';
}

function MoviesListContent() {
    const searchParams = useSearchParams();
    const statusParam = searchParams.get('status') || 'all'; // 'all' | 'now_showing' | 'coming_soon'
    const genreParam = searchParams.get('genre') || 'all';
    const keywordParam = searchParams.get('search') || '';
    const parsedStatus = parseStatusParam(statusParam);

    const [movies, setMovies] = useState<Movie[]>([]);
    const [genres, setGenres] = useState<IGenre[]>([]);
    const [selectedGenreId, setSelectedGenreId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<MovieStatusTab>(parsedStatus);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Fetch genres
    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const res = await fetch(`${API_URL}/genres/active`);
                const data: unknown = await res.json();
                setGenres(Array.isArray(data) ? data.filter(isGenre) : []);
            } catch (error) {
                console.error('Lỗi tải thể loại:', error);
            }
        };
        fetchGenres();
    }, [API_URL]);

    useEffect(() => {
        if (!genreParam || genreParam === 'all') {
            setSelectedGenreId('all');
            setCurrentPage(1);
            return;
        }

        if (genres.length === 0) return;

        const normalizedGenreParam = normalizeSearchText(genreParam);
        const matchedGenre = genres.find((genre) => (
            genre._id === genreParam ||
            genre.slug === genreParam ||
            normalizeSearchText(genre.name) === normalizedGenreParam ||
            normalizeSearchText(genre.slug) === normalizedGenreParam
        ));

        setSelectedGenreId(matchedGenre?._id || 'all');
        setCurrentPage(1);
    }, [genreParam, genres]);

    // Fetch movies (with genre filter)
    useEffect(() => {
        const fetchMovies = async () => {
            try {
                setLoading(true);
                const url = selectedGenreId && selectedGenreId !== 'all'
                    ? `${API_URL}/movies?genre=${selectedGenreId}`
                    : `${API_URL}/movies`;
                const res = await fetch(url);
                const data: unknown = await res.json();
                setMovies(Array.isArray(data) ? data.filter(isMovie) : []);
            } catch (error) {
                console.error('Lỗi tải phim:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
    }, [API_URL, selectedGenreId]);

    // Update activeTab when URL changes
    useEffect(() => {
        setActiveTab(parseStatusParam(statusParam));
        setCurrentPage(1); // Reset page when tab changes
    }, [statusParam]);

    // Filter movies based on status and search query
    const filteredMovies = movies.filter((movie) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const releaseDate = new Date(movie.release_date);
        releaseDate.setHours(0, 0, 0, 0);

        if (activeTab === 'now_showing' && releaseDate > today) {
            return false;
        } else if (activeTab === 'coming_soon' && releaseDate <= today) {
            return false;
        }

        const normalizedKeyword = normalizeSearchText(keywordParam);
        if (!normalizedKeyword) return true;

        return (
            normalizeSearchText(movie.title).includes(normalizedKeyword) ||
            movie.genres?.some((genre) =>
                normalizeSearchText(genre.name).includes(normalizedKeyword) ||
                normalizeSearchText(genre.slug).includes(normalizedKeyword)
            )
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredMovies.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedMovies = filteredMovies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Stats
    const allCount = movies.length;
    const nowShowingCount = movies.filter((m) => new Date(m.release_date) <= new Date()).length;
    const comingSoonCount = movies.filter((m) => new Date(m.release_date) > new Date()).length;

    // Tab config
    const tabs: MovieTab[] = [
        { key: 'all', label: 'Tất cả', count: allCount, color: 'red' },
        { key: 'now_showing', label: 'Đang chiếu', count: nowShowingCount, color: 'green' },
        { key: 'coming_soon', label: 'Sắp chiếu', count: comingSoonCount, color: 'yellow' },
    ];

    const handleTabChange = (tab: MovieStatusTab) => {
        setActiveTab(tab);
        setCurrentPage(1);
        // Update URL without page reload
        const url = new URL(window.location.href);
        if (tab === 'all') {
            url.searchParams.delete('status');
        } else {
            url.searchParams.set('status', tab);
        }
        window.history.pushState({}, '', url.toString());
    };

    const handleGenreChange = (genreId: string) => {
        setSelectedGenreId(genreId);
        setCurrentPage(1);
        const url = new URL(window.location.href);
        if (genreId === 'all') {
            url.searchParams.delete('genre');
        } else {
            url.searchParams.set('genre', genreId);
        }
        window.history.pushState({}, '', url.toString());
    };

    const formatReleaseDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition mb-4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Về trang chủ
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Danh Sách Phim</h1>
                    <p className="text-gray-500 mt-1">Khám phá các bộ phim đang chiếu và sắp ra mắt</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`px-5 py-2.5 rounded-full font-semibold transition-all cursor-pointer ${activeTab === tab.key
                                    ? tab.color === 'red'
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                        : tab.color === 'green'
                                            ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                                            : 'bg-yellow-500 text-black shadow-lg shadow-yellow-200'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* Thể loại phim */}
                <div className="mb-8 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">Thể loại phim:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleGenreChange('all')}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                                selectedGenreId === 'all'
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            Tất cả
                        </button>
                        {genres.map((genre) => (
                            <button
                                key={genre._id}
                                onClick={() => handleGenreChange(genre._id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                                    selectedGenreId === genre._id
                                        ? 'bg-red-50 text-red-600 border-red-200'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                {genre.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                                <div className="aspect-[2/3] bg-gray-200" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : paginatedMovies.length > 0 ? (
                    <>
                        {/* Movies Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                            {paginatedMovies.map((movie) => {
                                const isComingSoon = new Date(movie.release_date) > new Date();

                                return (
                                    <div key={movie._id} className="group">
                                        {isComingSoon ? (
                                            // Coming Soon Card
                                            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
                                                <div className="relative aspect-[2/3] overflow-hidden">
                                                    <SafeImage
                                                        src={getCloudinaryImageUrl(movie.poster_url, movieImagePresets.posterCard)}
                                                        alt={movie.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                    <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
                                                        SẮP CHIẾU
                                                    </div>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-6">
                                                        <Link
                                                            href={`/movie/${movie._id}`}
                                                            className="bg-yellow-500 text-black px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-yellow-400 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
                                                        >
                                                            XEM CHI TIẾT
                                                        </Link>
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-yellow-600 transition-colors">
                                                        {movie.title}
                                                    </h3>
                                                    <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {formatReleaseDate(movie.release_date)}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            // Now Showing Card (use MovieCard component)
                                            <MovieCard movie={movie} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-10">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((page) => {
                                        // Show first, last, current, and adjacent pages
                                        return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                    })
                                    .map((page, index, arr) => (
                                        <span key={page}>
                                            {index > 0 && arr[index - 1] !== page - 1 && (
                                                <span className="px-2 text-gray-400">...</span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-10 h-10 rounded-lg font-semibold transition ${currentPage === page
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        </span>
                                    ))}

                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Page Info */}
                        <p className="text-center text-sm text-gray-500 mt-4">
                            Hiển thị {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredMovies.length)} trong tổng số {filteredMovies.length} phim
                        </p>
                    </>
                ) : (
                    // Empty State
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có phim nào</h3>
                        <p className="text-gray-500">
                            {activeTab === 'now_showing'
                                ? 'Hiện tại không có phim đang chiếu.'
                                : activeTab === 'coming_soon'
                                    ? 'Hiện tại không có phim sắp chiếu.'
                                    : 'Không tìm thấy phim nào.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MoviesPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <MoviesListContent />
        </Suspense>
    );
}
