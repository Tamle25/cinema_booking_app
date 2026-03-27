'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BUFFER_MINUTES = 15; // Thời gian dọn phòng

interface IMovie {
    _id: string;
    title: string;
    duration: number;
    is_active: boolean;
}

interface ICinemaSystem {
    _id: string;
    name: string;
    logo_url?: string;
}

interface ICinema {
    _id: string;
    name: string;
    city: string;
    cinema_system: string | { _id: string; name: string };
}

interface IRoom {
    _id: string;
    name: string;
    type: string;
    cinema: string | { _id: string; name: string };
    is_active?: boolean;
}

export default function CreateShowtimePage() {
    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const [movies, setMovies] = useState<IMovie[]>([]);
    const [cinemaSystems, setCinemaSystems] = useState<ICinemaSystem[]>([]);
    const [cinemas, setCinemas] = useState<ICinema[]>([]);
    const [rooms, setRooms] = useState<IRoom[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        cinema_system_id: '', // Hệ thống rạp (để filter)
        movie_id: '',
        cinema_id: '',
        room_id: '',
        start_time: '',
        price: 75000,
    });

    // Fetch all data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [moviesRes, systemsRes, cinemasRes, roomsRes] = await Promise.all([
                    fetch(`${API_URL}/movies`),
                    fetch(`${API_URL}/cinema-systems`),
                    fetch(`${API_URL}/cinemas`),
                    fetch(`${API_URL}/rooms`)
                ]);
                const moviesData = await moviesRes.json();
                // Chỉ lấy phim đang active
                setMovies(moviesData.filter((m: IMovie) => m.is_active));
                setCinemaSystems(await systemsRes.json());
                setCinemas(await cinemasRes.json());
                setRooms(await roomsRes.json());
            } catch (error) {
                console.error('Lỗi tải dữ liệu:', error);
            }
        };
        fetchData();
    }, [API_URL]);

    // Filter cinemas by selected cinema system
    const filteredCinemas = useMemo(() => {
        if (!formData.cinema_system_id) return [];
        return cinemas.filter(c => {
            const systemId = typeof c.cinema_system === 'object' ? c.cinema_system._id : c.cinema_system;
            return systemId === formData.cinema_system_id;
        });
    }, [cinemas, formData.cinema_system_id]);

    // Filter rooms by selected cinema (FIX: handle cinema as object or string)
    const filteredRooms = useMemo(() => {
        if (!formData.cinema_id) return [];
        return rooms.filter(r => {
            // Skip nếu room không có cinema
            if (!r.cinema) return false;
            // Cinema có thể là object (populated) hoặc string (ID)
            const cinemaId = typeof r.cinema === 'object' ? r.cinema._id : r.cinema;
            // Chỉ lấy phòng đang hoạt động
            return cinemaId === formData.cinema_id && (r.is_active !== false);
        });
    }, [rooms, formData.cinema_id]);

    // Reset dependent fields when parent changes
    useEffect(() => {
        setFormData(prev => ({ ...prev, cinema_id: '', room_id: '' }));
    }, [formData.cinema_system_id]);

    useEffect(() => {
        setFormData(prev => ({ ...prev, room_id: '' }));
    }, [formData.cinema_id]);

    // Calculate estimated end time
    const estimatedEndTime = useMemo(() => {
        const selectedMovie = movies.find(m => m._id === formData.movie_id);
        if (!selectedMovie || !formData.start_time) return null;

        const start = new Date(formData.start_time);
        const end = new Date(start.getTime() + (selectedMovie.duration + BUFFER_MINUTES) * 60000);
        return end;
    }, [movies, formData.movie_id, formData.start_time]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.movie_id) {
            alert('❌ Vui lòng chọn phim!');
            return;
        }
        if (!formData.cinema_id) {
            alert('❌ Vui lòng chọn rạp!');
            return;
        }
        if (!formData.room_id) {
            alert('❌ Vui lòng chọn phòng chiếu!');
            return;
        }
        if (!formData.start_time) {
            alert('❌ Vui lòng chọn thời gian chiếu!');
            return;
        }
        if (!formData.price || formData.price <= 0) {
            alert('❌ Vui lòng nhập giá vé hợp lệ!');
            return;
        }

        setIsSubmitting(true);

        try {
            // Không gửi cinema_system_id lên server
            const { cinema_system_id, ...submitData } = formData;

            const res = await fetch(`${API_URL}/showtimes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData),
            });

            if (res.ok) {
                alert('✅ Thêm suất chiếu thành công!');
                router.push('/admin/showtimes');
            } else {
                const error = await res.json();
                alert('❌ Lỗi: ' + (error.message || 'Không thể tạo suất chiếu'));
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('❌ Không thể kết nối đến server!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedMovie = movies.find(m => m._id === formData.movie_id);

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
                <h1 className="text-2xl font-bold text-gray-800">Thêm Suất Chiếu Mới</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-5">
                {/* Movie Selection */}
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
                            Thời lượng: {selectedMovie.duration} phút + {BUFFER_MINUTES} phút dọn phòng
                        </p>
                    )}
                </div>

                <hr className="border-gray-200" />

                {/* Cinema System Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hệ thống rạp <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="cinema_system_id"
                        value={formData.cinema_system_id}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- Chọn hệ thống rạp --</option>
                        {cinemaSystems.map((system) => (
                            <option key={system._id} value={system._id}>
                                {system.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Cinema Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chọn rạp <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="cinema_id"
                        value={formData.cinema_id}
                        onChange={handleChange}
                        disabled={!formData.cinema_system_id}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <option value="">
                            {formData.cinema_system_id ? '-- Chọn rạp --' : '-- Chọn hệ thống rạp trước --'}
                        </option>
                        {filteredCinemas.map((cinema) => (
                            <option key={cinema._id} value={cinema._id}>
                                {cinema.name} - {cinema.city}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Room Selection */}
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
                    {formData.cinema_id && filteredRooms.length === 0 && (
                        <p className="text-sm text-red-500 mt-1">Rạp này chưa có phòng chiếu nào.</p>
                    )}
                </div>

                <hr className="border-gray-200" />

                {/* Start Time */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        min={new Date().toISOString().slice(0, 16)} // Không cho chọn quá khứ
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* Estimated End Time */}
                {estimatedEndTime && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <span className="font-medium">Giờ kết thúc dự kiến:</span>{' '}
                            {estimatedEndTime.toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            (Bao gồm {BUFFER_MINUTES} phút dọn phòng)
                        </p>
                    </div>
                )}

                {/* Price */}
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

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                        ⚠️ <span className="font-medium">Lưu ý:</span> Hệ thống sẽ tự động kiểm tra:
                    </p>
                    <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside space-y-0.5">
                        <li>Không trùng lấp với suất chiếu khác trong cùng phòng</li>
                        <li>Không tạo suất chiếu trong quá khứ</li>
                        <li>Phim phải đang hoạt động (is_active = true)</li>
                    </ul>
                </div>

                {/* Submit */}
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
                        {isSubmitting ? 'Đang lưu...' : 'Thêm Suất Chiếu'}
                    </button>
                </div>
            </form>
        </div>
    );
}

