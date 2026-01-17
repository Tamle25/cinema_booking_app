'use client';

import { useEffect, useState } from 'react';
import { ICinemaSystem } from '@/types';

export default function CinemaSystemsPage() {
  const [systems, setSystems] = useState<ICinemaSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ICinemaSystem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    color_code: '#3B82F6',
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch cinema systems
  const fetchSystems = async () => {
    try {
      const res = await fetch(`${API_URL}/cinema-systems`);
      const data = await res.json();
      setSystems(data);
    } catch (error) {
      console.error('Lỗi tải hãng phim:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();
  }, []);

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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const openModal = (system?: ICinemaSystem) => {
    if (system) {
      setEditingSystem(system);
      setFormData({
        name: system.name,
        slug: system.slug,
        logo_url: system.logo_url || '',
        color_code: system.color_code || '#3B82F6',
      });
    } else {
      setEditingSystem(null);
      setFormData({ name: '', slug: '', logo_url: '', color_code: '#3B82F6' });
    }
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingSystem(null);
    setFormData({ name: '', slug: '', logo_url: '', color_code: '#3B82F6' });
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên hãng phim!');
      return;
    }

    setSaving(true);
    try {
      const url = editingSystem 
        ? `${API_URL}/cinema-systems/${editingSystem._id}`
        : `${API_URL}/cinema-systems`;
      
      const res = await fetch(url, {
        method: editingSystem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(editingSystem ? 'Cập nhật thành công!' : 'Thêm hãng phim thành công!');
        closeModal();
        fetchSystems();
      } else {
        const error = await res.json();
        alert(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Lỗi lưu hãng phim:', error);
      alert('Có lỗi xảy ra!');
    } finally {
      setSaving(false);
    }
  };

  // Delete cinema system
  const handleDelete = async (system: ICinemaSystem) => {
    if (!confirm(`Bạn có chắc muốn xóa hãng "${system.name}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/cinema-systems/${system._id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Xóa thành công!');
        fetchSystems();
      } else {
        const error = await res.json();
        alert(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Lỗi xóa:', error);
      alert('Có lỗi xảy ra!');
    }
  };

  // Filter systems by search term
  const filteredSystems = systems.filter(system =>
    system.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Hãng phim</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý các thương hiệu rạp chiếu phim</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm hãng phim
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm hãng phim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <span className="text-sm text-gray-500">
            Tổng: <strong>{filteredSystems.length}</strong> hãng
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hãng phim</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Màu</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSystems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? 'Không tìm thấy hãng phim phù hợp' : 'Chưa có hãng phim nào'}
                </td>
              </tr>
            ) : (
              filteredSystems.map((system) => (
                <tr key={system._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold overflow-hidden"
                        style={{ backgroundColor: system.color_code || '#3B82F6' }}
                      >
                        {system.logo_url ? (
                          <img src={system.logo_url} alt={system.name} className="w-10 h-10 object-contain" />
                        ) : (
                          system.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{system.name}</p>
                        {system.logo_url && (
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{system.logo_url}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">{system.slug}</code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border border-gray-200"
                        style={{ backgroundColor: system.color_code || '#3B82F6' }}
                      ></div>
                      <span className="text-sm text-gray-600">{system.color_code || '#3B82F6'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openModal(system)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Sửa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(system)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingSystem ? 'Sửa hãng phim' : 'Thêm hãng phim mới'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên hãng phim <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="VD: CGV Cinemas"
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
                  placeholder="cgv-cinemas"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo</label>
                <input
                  type="text"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Màu đại diện</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="color_code"
                    value={formData.color_code}
                    onChange={handleInputChange}
                    className="w-12 h-10 rounded cursor-pointer border border-gray-200"
                  />
                  <input
                    type="text"
                    name="color_code"
                    value={formData.color_code}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
              
              {/* Preview */}
              {formData.name && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Xem trước:</p>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: formData.color_code }}
                    >
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        formData.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <span className="font-semibold">{formData.name}</span>
                  </div>
                </div>
              )}
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
                {saving ? 'Đang lưu...' : (editingSystem ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
