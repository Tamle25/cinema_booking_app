'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { authHeaders } from '@/lib/api';
import { toastSuccess, toastWarning, toastError } from '@/utils/toast';

interface IMovie {
    _id: string;
    title: string;
    duration: number;
}

interface ICinema {
    _id: string;
    name: string;
    city: string;
}

interface IRoom {
    _id: string;
    name: string;
    type: string;
    cinema: string;
}

export default function EditShowtimePage() {
    const router = useRouter();
    const params = useParams();
    const showtimeId = params.id as string;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const [movies, setMovies] = useState<IMovie[]>([]);
    const [cinemas, setCinemas] = useState<ICinema[]>([]);
    const [rooms, setRooms] = useState<IRoom[]>([]);
    const [filteredRooms, setFilteredRooms] = useState<IRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        movie_id: '',
        cinema_id: '',
        room_id: '',
        start_time: '',
        price: 0 as number | '',
        is_active: true,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [moviesRes, cinemasRes, roomsRes, showtimeRes] = await Promise.all([
                    fetch(`${API_URL}/movies`),
                    fetch(`${API_URL}/cinemas`),
                    fetch(`${API_URL}/rooms`),
                    fetch(`${API_URL}/showtimes/${showtimeId}`)
                ]);

                const moviesData = await moviesRes.json();
                const cinemasData = await cinemasRes.json();
                const roomsData = await roomsRes.json();
                const showtimeData = await showtimeRes.json();

                setMovies(moviesData);
                setCinemas(cinemasData);
                setRooms(roomsData);

                const startTime = showtimeData.start_time
                    ? new Date(showtimeData.start_time).toISOString().slice(0, 16)
                    : '';

                setFormData({
                    movie_id: showtimeData.movie?._id || '',
                    cinema_id: showtimeData.cinema?._id || '',
                    room_id: showtimeData.room?._id || '',
                    start_time: startTime,
                    price: showtimeData.price || 0,
                    is_active: showtimeData.is_active ?? true,
                });

            } catch (error) {
                console.error('Lỗi tải dữ liệu:', error);
                toastError('Không thể tải thông tin suất chiếu!');
                router.push('/admin/showtimes');
            } finally {
                setIsLoading(false);
            }
        };

        if (showtimeId) fetchData();
    }, [API_URL, showtimeId, router]);

    useEffect(() => {
        if (formData.cinema_id) {
            setFilteredRooms(rooms.filter(r => r.cinema === formData.cinema_id));
        } else {
            setFilteredRooms([]);
        }
    }, [formData.cinema_id, rooms]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: (e.target as HTMLInputElement).checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'price' ? (value === '' ? '' : Number(value)) : value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.movie_id) {
            toastWarning('Vui lòng chọn phim!');
            return;
        }
        if (!formData.cinema_id) {
            toastWarning('Vui lòng chọn rạp!');
            return;
        }
        if (!formData.room_id) {
            toastWarning('Vui lòng chọn phòng chiếu!');
            return;
        }
        if (!formData.start_time) {
            toastWarning('Vui lòng chọn thời gian chiếu!');
            return;
        }
        if (!formData.price || Number(formData.price) <= 0) {
            toastWarning('Vui lòng nhập giá vé hợp lệ!');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/showtimes/${showtimeId}`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toastSuccess('Cập nhật suất chiếu thành công!');
                router.push('/admin/showtimes');
            } else {
                const error = await res.json();
                toastError('Lỗi: ' + (error.message || 'Không thể cập nhật suất chiếu'));
            }
        } catch (error) {
            console.error('Lỗi:', error);
            toastError('Không thể kết nối đến server!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedMovie = movies.find(m => m._id === formData.movie_id);

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Link
                    href="/admin/showtimes"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm mb-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Quay lại danh sách
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Sửa Suất Chiếu</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-5">
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chọn phim <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="movie_id"
                        value={formData.movie_id}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- Chọn phim --</option>
                        {movies.map((movie) => (
                            <option key={movie._id} value={movie._id}>
                                {movie.title} ({movie.duration} phút)
                            </option>
                        ))}
                    </select>
                    {selectedMovie && (
                        <p className="text-sm text-gray-500 mt-1">
                            Thời lượng: {selectedMovie.duration} phút
                        </p>
                    )}
                </div>

                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chọn rạp <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="cinema_id"
                        value={formData.cinema_id}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- Chọn rạp --</option>
                        {cinemas.map((cinema) => (
                            <option key={cinema._id} value={cinema._id}>
                                {cinema.name} - {cinema.city}
                            </option>
                        ))}
                    </select>
                </div>

                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chọn phòng chiếu <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="room_id"
                        value={formData.room_id}
                        onChange={handleChange}
                        disabled={!formData.cinema_id}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <option value="">
                            {formData.cinema_id ? '-- Chọn phòng --' : '-- Chọn rạp trước --'}
                        </option>
                        {filteredRooms.map((room) => (
                            <option key={room._id} value={room._id}>
                                {room.name} ({room.type})
                            </option>
                        ))}
                    </select>
                </div>

                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian chiếu <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giá vé (VNĐ) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        min={0}
                        step={1000}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                        Đang hoạt động
                    </label>
                </div>

                
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/showtimes')}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded-lg text-white font-medium transition ${isSubmitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {isSubmitting ? 'Đang lưu...' : 'Cập Nhật'}
                    </button>
                </div>
            </form>
        </div>
    );
}
