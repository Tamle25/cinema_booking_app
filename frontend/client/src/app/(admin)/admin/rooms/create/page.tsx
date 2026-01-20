'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ICinema {
    _id: string;
    name: string;
}

const ROOM_TYPES = ['2D', '3D', 'IMAX', '4DX', 'ScreenX', 'Dolby Atmos'];

export default function CreateRoomPage() {
    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const [cinemas, setCinemas] = useState<ICinema[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        cinema_id: '',
        type: '2D',
        rows: 10,
        columns: 12,
    });

    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                const res = await fetch(`${API_URL}/cinemas`);
                setCinemas(await res.json());
            } catch (error) {
                console.error('Lỗi tải danh sách rạp:', error);
            }
        };
        fetchCinemas();
    }, [API_URL]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['rows', 'columns'].includes(name) ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('❌ Vui lòng nhập tên phòng!');
            return;
        }
        if (!formData.cinema_id) {
            alert('❌ Vui lòng chọn rạp!');
            return;
        }
        if (formData.rows < 1 || formData.columns < 1) {
            alert('❌ Số hàng và số cột phải lớn hơn 0!');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                alert('✅ Thêm phòng chiếu thành công!');
                router.push('/admin/rooms');
            } else {
                const error = await res.json();
                alert('❌ Lỗi: ' + (error.message || 'Không thể tạo phòng'));
            }
        } catch (error) {
            alert('❌ Không thể kết nối đến server!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalSeats = formData.rows * formData.columns;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Link href="/admin/rooms" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Quay lại
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Thêm Phòng Chiếu Mới</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên phòng <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="VD: Phòng 01, IMAX Theater"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rạp chiếu <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="cinema_id"
                        value={formData.cinema_id}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                    >
                        <option value="">-- Chọn rạp --</option>
                        {cinemas.map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loại phòng <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                    >
                        {ROOM_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Số hàng ghế <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="rows"
                            value={formData.rows}
                            onChange={handleChange}
                            min={1}
                            max={26}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Số cột ghế <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="columns"
                            value={formData.columns}
                            onChange={handleChange}
                            min={1}
                            max={30}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                        />
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                        <span className="font-medium">Tổng số ghế:</span> {totalSeats} ghế ({formData.rows} hàng × {formData.columns} cột)
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/rooms')}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded-lg text-white font-medium ${isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {isSubmitting ? 'Đang lưu...' : 'Thêm Phòng'}
                    </button>
                </div>
            </form>
        </div>
    );
}
