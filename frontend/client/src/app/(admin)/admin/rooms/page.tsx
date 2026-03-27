'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

interface IRoom {
    _id: string;
    name: string;
    type: string;
    rows: number;
    columns: number;
    total_seats: number;
    is_active: boolean;
    cinema: {
        _id: string;
        name: string;
    };
}

interface ICinema {
    _id: string;
    name: string;
}

export default function AdminRoomsPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const [rooms, setRooms] = useState<IRoom[]>([]);
    const [cinemas, setCinemas] = useState<ICinema[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCinema, setFilterCinema] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Fetch cinemas (for filter dropdown)
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

    // Fetch rooms with pagination
    useEffect(() => {
        const fetchRooms = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: itemsPerPage.toString(),
                });
                if (filterCinema) {
                    params.append('cinema_id', filterCinema);
                }

                const res = await fetch(`${API_URL}/rooms/admin/list?${params.toString()}`);
                const responseData = await res.json();

                setRooms(responseData.data || []);
                setTotalPages(responseData.meta?.totalPages || 1);
                setTotal(responseData.meta?.totalItems || 0);
            } catch (error) {
                console.error('Lỗi tải dữ liệu:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, [API_URL, currentPage, filterCinema]);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterCinema]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa phòng "${name}"?`)) return;

        try {
            const res = await fetch(`${API_URL}/rooms/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('✅ Đã xóa phòng chiếu!');
                // Xóa khỏi danh sách UI
                setRooms(prev => prev.filter(r => r._id !== id));
                setTotal(prev => prev - 1);
            } else {
                alert('❌ Không thể xóa phòng!');
            }
        } catch (error) {
            alert('❌ Lỗi kết nối!');
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản Lý Phòng Chiếu</h1>
                    <p className="text-gray-500 mt-1">Tổng cộng {total} phòng</p>
                </div>
                <Link
                    href="/admin/rooms/create"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm Phòng
                </Link>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo rạp</label>
                <select
                    value={filterCinema}
                    onChange={(e) => setFilterCinema(e.target.value)}
                    className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                >
                    <option value="">Tất cả rạp</option>
                    {cinemas.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-lg font-medium">Không có phòng chiếu nào</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tên Phòng</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Rạp</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Loại</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Sơ đồ ghế</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tổng ghế</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Trạng thái</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rooms.map((room) => (
                                <tr key={room._id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{room.name}</td>
                                    <td className="px-4 py-3 text-gray-700">{room.cinema?.name || 'N/A'}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm">
                                            {room.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{room.rows} x {room.columns}</td>
                                    <td className="px-4 py-3 text-gray-700">{room.total_seats} ghế</td>
                                    <td className="px-4 py-3">
                                        {room.is_active !== false ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                                Hoạt động
                                            </span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                                                Bảo trì
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/admin/rooms/edit/${room._id}`}
                                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                                title="Sửa"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(room._id, room.name)}
                                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
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

            {/* Pagination */}
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

