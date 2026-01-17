'use client';

import { useEffect, useState } from 'react';
import { ICinemaSystem, ICinema } from '@/types';

export default function CinemasPage() {
  const [cinemas, setCinemas] = useState<ICinema[]>([]);
  const [cinemaSystems, setCinemaSystems] = useState<ICinemaSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCinema, setEditingCinema] = useState<ICinema | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    city: '',
    cinema_system_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSystem, setFilterSystem] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch data
  const fetchData = async () => {
    try {
      const [cinemasRes, systemsRes] = await Promise.all([
        fetch(`${API_URL}/cinemas`),
        fetch(`${API_URL}/cinema-systems`),
      ]);
      const cinemasData = await cinemasRes.json();
      const systemsData = await systemsRes.json();
      setCinemas(cinemasData);
      setCinemaSystems(systemsData);
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get unique cities
  const uniqueCities = [...new Set(cinemas.map(c => c.city).filter(Boolean))];

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'name') {
        newData.slug = generateSlug(value);
      }
      return newData;
    });
  };

  // Open modal for create/edit
  const openModal = (cinema?: ICinema) => {
    if (cinema) {
      setEditingCinema(cinema);
      const systemId = typeof cinema.cinema_system === 'object' 
        ? cinema.cinema_system._id 
        : cinema.cinema_system;
      setFormData({
        name: cinema.name,
        slug: cinema.slug,
        address: cinema.address || '',
        city: cinema.city || '',
        cinema_system_id: systemId,
      });
    } else {
      setEditingCinema(null);
      setFormData({ name: '', slug: '', address: '', city: '', cinema_system_id: '' });
    }
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingCinema(null);
    setFormData({ name: '', slug: '', address: '', city: '', cinema_system_id: '' });
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.cinema_system_id) {
      alert('Vui lòng nhập đầy đủ thông tin bắt buộc!');
      return;
    }

    setSaving(true);
    try {
      const url = editingCinema 
        ? `${API_URL}/cinemas/${editingCinema._id}`
        : `${API_URL}/cinemas`;
      
      const res = await fetch(url, {
        method: editingCinema ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(editingCinema ? 'Cập nhật thành công!' : 'Thêm rạp chiếu thành công!');
        closeModal();
        fetchData();
      } else {
        const error = await res.json();
        alert(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Lỗi lưu rạp chiếu:', error);
      alert('Có lỗi xảy ra!');
    } finally {
      setSaving(false);
    }
  };

  // Delete cinema
  const handleDelete = async (cinema: ICinema) => {
    if (!confirm(`Bạn có chắc muốn xóa rạp "${cinema.name}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/cinemas/${cinema._id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Xóa thành công!');
        fetchData();
      } else {
        const error = await res.json();
        alert(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Lỗi xóa:', error);
      alert('Có lỗi xảy ra!');
    }
  };

  // Filter cinemas
  const filteredCinemas = cinemas.filter(cinema => {
    const matchSearch = cinema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       cinema.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const systemId = typeof cinema.cinema_system === 'object' 
      ? cinema.cinema_system._id 
      : cinema.cinema_system;
    const matchSystem = !filterSystem || systemId === filterSystem;
    const matchCity = !filterCity || cinema.city === filterCity;
    return matchSearch && matchSystem && matchCity;
  });

  // Get system info
  const getSystemInfo = (cinema: ICinema) => {
    if (typeof cinema.cinema_system === 'object') {
      return cinema.cinema_system;
    }
    return cinemaSystems.find(s => s._id === cinema.cinema_system);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Rạp chiếu</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý các rạp chiếu phim trong hệ thống</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm rạp chiếu
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm rạp chiếu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <select
            value={filterSystem}
            onChange={(e) => setFilterSystem(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Tất cả hãng</option>
            {cinemaSystems.map(system => (
              <option key={system._id} value={system._id}>{system.name}</option>
            ))}
          </select>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Tất cả khu vực</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            Tổng: <strong>{filteredCinemas.length}</strong> rạp
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rạp chiếu</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hãng</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Khu vực</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCinemas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm || filterSystem || filterCity ? 'Không tìm thấy rạp chiếu phù hợp' : 'Chưa có rạp chiếu nào'}
                </td>
              </tr>
            ) : (
              filteredCinemas.map((cinema) => {
                const system = getSystemInfo(cinema);
                return (
                  <tr key={cinema._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{cinema.name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[300px]">{cinema.address}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {system && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: system.color_code || '#3B82F6' }}
                          >
                            {system.logo_url ? (
                              <img src={system.logo_url} alt="" className="w-6 h-6 object-contain" />
                            ) : (
                              system.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{system.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {cinema.city || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(cinema)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(cinema)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Xóa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingCinema ? 'Sửa rạp chiếu' : 'Thêm rạp chiếu mới'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hãng phim <span className="text-red-500">*</span>
                </label>
                <select
                  name="cinema_system_id"
                  value={formData.cinema_system_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">-- Chọn hãng phim --</option>
                  {cinemaSystems.map(system => (
                    <option key={system._id} value={system._id}>{system.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên rạp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="VD: CGV Vincom Bà Triệu"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="cgv-vincom-ba-trieu"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Tầng 6, TTTM Vincom, 191 Bà Triệu, Hà Nội"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Hà Nội"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  list="cities-list"
                />
                <datalist id="cities-list">
                  {uniqueCities.map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : (editingCinema ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
