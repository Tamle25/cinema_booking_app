'use client';

import SafeImage from '@/components/SafeImage';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { authHeaders } from '@/lib/api';
import { toastSuccess, toastError } from '@/utils/toast';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';
import ConfirmModal from '@/components/ConfirmModal';

interface IShowtime {
    _id: string;
    movie: {
        _id: string;
        title: string;
        poster_url: string;
        duration: number;
    };
    cinema: {
        _id: string;
        name: string;
    };
    room: {
        _id: string;
        name: string;
        type: string;
    };
    start_time: string;
    end_time: string;
    price: number;
    is_active: boolean;
    booked_seats: string[];
}

interface IMovie {
    _id: string;
    title: string;
}

interface ICinemaSystem {
    _id: string;
    name: string;
    logo_url?: string;
}

interface ICinema {
    _id: string;
    name: string;
    city?: string;
    cinema_system?: string | { _id: string; name: string };
}

export default function AdminShowtimesPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const [showtimes, setShowtimes] = useState<IShowtime[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [movies, setMovies] = useState<IMovie[]>([]);
    const [cinemas, setCinemas] = useState<ICinema[]>([]);
    const [cinemaSystems, setCinemaSystems] = useState<ICinemaSystem[]>([]);
    const [filterMovie, setFilterMovie] = useState('');
    const [filterCinemaSystem, setFilterCinemaSystem] = useState('');
    const [filterCinema, setFilterCinema] = useState('');
    const [filterDate, setFilterDate] = useState('');

    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; movieTitle: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [moviesRes, cinemasRes, systemsRes] = await Promise.all([
                    fetch(`${API_URL}/movies`),
                    fetch(`${API_URL}/cinemas`),
                    fetch(`${API_URL}/cinema-systems`)
                ]);
                setMovies(await moviesRes.json());
                setCinemas(await cinemasRes.json());
                setCinemaSystems(await systemsRes.json());
            } catch (error) {
                console.error('Lỗi tải dữ liệu:', error);
            }
        };
        fetchOptions();
    }, [API_URL]);

    const filteredCinemas = useMemo(() => {
        if (!filterCinemaSystem) return cinemas;
        return cinemas.filter(c => {
            if (!c.cinema_system) return false;
            const systemId = typeof c.cinema_system === 'object' ? c.cinema_system._id : c.cinema_system;
            return systemId === filterCinemaSystem;
        });
    }, [cinemas, filterCinemaSystem]);

    useEffect(() => {
        if (filterCinema && filterCinemaSystem) {
            const hasCinema = filteredCinemas.some(c => c._id === filterCinema);
            if (!hasCinema) {
                setFilterCinema('');
            }
        }
    }, [filterCinemaSystem, filteredCinemas, filterCinema]);

    useEffect(() => {
        const fetchShowtimes = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: itemsPerPage.toString(),
                });
                if (filterMovie) params.append('movie_id', filterMovie);
                if (filterCinemaSystem) params.append('cinema_system_id', filterCinemaSystem);
                if (filterCinema) params.append('cinema_id', filterCinema);
                if (filterDate) params.append('date', filterDate);

                const res = await fetch(`${API_URL}/showtimes/admin/list?${params.toString()}`, {
                    headers: authHeaders(),
                });
                const responseData = await res.json();

                setShowtimes(responseData.data || []);
                setTotalPages(responseData.meta?.totalPages || 1);
                setTotal(responseData.meta?.totalItems || 0);
            } catch (error) {
                console.error('Lỗi tải suất chiếu:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchShowtimes();
    }, [API_URL, currentPage, filterMovie, filterCinemaSystem, filterCinema, filterDate, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterMovie, filterCinemaSystem, filterCinema, filterDate]);

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleDelete = (id: string, movieTitle: string) => {
        setDeleteTarget({ id, movieTitle });
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/showtimes/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (res.ok) {
                toastSuccess('Đã xóa suất chiếu thành công!');
                setShowtimes(prev => prev.filter(s => s._id !== deleteTarget.id));
                setTotal(prev => prev - 1);
                setIsConfirmOpen(false);
            } else {
                const error = await res.json();
                toastError('Lỗi: ' + (error.message || 'Không thể xóa suất chiếu'));
            }
        } catch (error) {
            console.error('Lỗi xóa:', error);
            toastError('Không thể kết nối đến server!');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản Lý Suất Chiếu</h1>
                    <p className="text-gray-500 mt-1">Tổng cộng {total} suất chiếu</p>
                </div>
                <Link
                    href="/admin/showtimes/create"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm Suất Chiếu
                </Link>
            </div>

            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phim</label>
                        <select
                            value={filterMovie}
                            onChange={(e) => setFilterMovie(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Tất cả phim</option>
                            {movies.map((m) => (
                                <option key={m._id} value={m._id}>{m.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hệ thống rạp</label>
                        <select
                            value={filterCinemaSystem}
                            onChange={(e) => setFilterCinemaSystem(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Tất cả hệ thống</option>
                            {cinemaSystems.map((sys) => (
                                <option key={sys._id} value={sys._id}>{sys.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rạp</label>
                        <select
                            value={filterCinema}
                            onChange={(e) => setFilterCinema(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Tất cả rạp</option>
                            {filteredCinemas.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setFilterMovie('');
                                setFilterCinemaSystem('');
                                setFilterCinema('');
                                setFilterDate('');
                            }}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                open={isConfirmOpen}
                title="Xác nhận xóa suất chiếu"
                message={`Bạn có chắc muốn xóa suất chiếu của phim "${deleteTarget?.movieTitle}"? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                loading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsConfirmOpen(false)}
            />

            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : showtimes.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                        <p className="text-lg font-medium">Không có suất chiếu nào</p>
                        <p className="mt-1">Thử thay đổi bộ lọc hoặc thêm suất chiếu mới.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Phim</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Rạp</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Phòng</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Thời gian</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Giá vé</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Đã đặt</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Trạng thái</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {showtimes.map((showtime) => (
                                <tr key={showtime._id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {showtime.movie?.poster_url && (
                                                <SafeImage
                                                    src={getCloudinaryImageUrl(showtime.movie.poster_url, movieImagePresets.posterThumb)}
                                                    alt={showtime.movie.title}
                                                    className="w-10 h-14 object-cover rounded"
                                                />
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900 line-clamp-1">{showtime.movie?.title || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{showtime.movie?.duration || 0} phút</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{showtime.cinema?.name || 'N/A'}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-gray-700">{showtime.room?.name || 'N/A'}</span>
                                        <span className="text-xs text-gray-500 ml-1">({showtime.room?.type || 'N/A'})</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-gray-900 font-medium">{formatDateTime(showtime.start_time)}</p>
                                        <p className="text-xs text-gray-500">→ {formatDateTime(showtime.end_time)}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-900 font-medium">{formatCurrency(showtime.price)}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                            {showtime.booked_seats?.length || 0} ghế
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {showtime.is_active ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                                Hoạt động
                                            </span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                                                Đã xóa
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/admin/showtimes/edit/${showtime._id}`}
                                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                                                title="Sửa"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(showtime._id, showtime.movie?.title || '')}
                                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition"
                                                title="Xóa"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={total}
                itemsPerPage={itemsPerPage}
                onLimitChange={(limit) => {
                    setItemsPerPage(limit);
                    setCurrentPage(1);
                }}
            />
        </div>
    );
}
