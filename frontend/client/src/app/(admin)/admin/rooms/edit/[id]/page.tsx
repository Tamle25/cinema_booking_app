'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { authHeaders } from '@/lib/api';
import { toastSuccess, toastWarning, toastError } from '@/utils/toast';

interface ICinema {
    _id: string;
    name: string;
}

const ROOM_TYPES = ['2D', '3D', 'IMAX', '4DX', 'ScreenX', 'Dolby Atmos'];

export default function EditRoomPage() {
    const router = useRouter();
    const params = useParams();
    const roomId = params.id as string;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const [cinemas, setCinemas] = useState<ICinema[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        cinema_id: '',
        type: '2D',
        rows: 10,
        columns: 12,
        is_active: true,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cinemasRes, roomRes] = await Promise.all([
                    fetch(`${API_URL}/cinemas`),
                    fetch(`${API_URL}/rooms/${roomId}`)
                ]);

                const cinemasData = await cinemasRes.json();
                const roomData = await roomRes.json();

                setCinemas(cinemasData);
                setFormData({
                    name: roomData.name || '',
                    cinema_id: roomData.cinema?._id || '',
                    type: roomData.type || '2D',
                    rows: roomData.rows || 10,
                    columns: roomData.columns || 12,
                    is_active: roomData.is_active ?? true,
                });
            } catch (error) {
                console.error('Lỗi tải dữ liệu:', error);
                toastError('❌ Không thể tải thông tin phòng!');
            } finally {
                setIsLoading(false);
            }
        };

        if (roomId) fetchData();
    }, [API_URL, roomId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: ['rows', 'columns'].includes(name) ? Number(value) : value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toastWarning('❌ Vui lòng nhập tên phòng!');
            return;
        }
        if (!formData.cinema_id) {
            toastWarning('❌ Vui lòng chọn rạp!');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/rooms/${roomId}`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toastSuccess('✅ Cập nhật phòng chiếu thành công!');
                router.push('/admin/rooms');
            } else {
                const error = await res.json();
                toastError('❌ Lỗi: ' + (error.message || 'Không thể cập nhật'));
            }
        } catch (error) {
            toastError('❌ Không thể kết nối đến server!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalSeats = formData.rows * formData.columns;

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
                <Link href="/admin/rooms" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Quay lại
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Sửa Phòng Chiếu</h1>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại phòng</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số hàng ghế</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số cột ghế</label>
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
                        <span className="font-medium">Tổng số ghế:</span> {totalSeats} ghế
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                        Phòng đang hoạt động
                    </label>
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
                        {isSubmitting ? 'Đang lưu...' : 'Cập Nhật'}
                    </button>
                </div>
            </form>
        </div>
    );
}
