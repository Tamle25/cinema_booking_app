'use client';

import { useEffect, useState, useMemo } from 'react';
import { ICombo, ICinemaSystem } from '@/types';
import Pagination from '@/components/Pagination';
import { authHeaders } from '@/lib/api';
import { toastSuccess, toastWarning, toastError } from '@/utils/toast';
import ConfirmModal from '@/components/ConfirmModal';

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<ICombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ICombo | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cinemaSystems, setCinemaSystems] = useState<ICinemaSystem[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ICombo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    category: 'combo',
    cinema_system_id: '',
    is_active: true,
    is_popular: false,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchCombos = async () => {
    try {
      const [combosRes, systemsRes] = await Promise.all([
        fetch(`${API_URL}/combos/all`, { headers: authHeaders() }),
        fetch(`${API_URL}/cinema-systems`)
      ]);
      const combosData = await combosRes.json();
      const systemsData = await systemsRes.json();
      
      setCombos(Array.isArray(combosData) ? combosData : []);
      setCinemaSystems(Array.isArray(systemsData) ? systemsData : (systemsData.data || []));
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCombos();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (name === 'price') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const res = await fetch(`${API_URL}/combos/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formDataUpload,
      });

      const data = await res.json();
      if (data.image_url) {
        setFormData(prev => ({ ...prev, image_url: data.image_url }));
      } else {
        toastError('Lỗi upload ảnh');
      }
    } catch (error) {
      console.error('Lỗi upload:', error);
      toastError('Có lỗi xảy ra khi upload ảnh!');
    } finally {
      setUploading(false);
    }
  };

  const openModal = (combo?: ICombo) => {
    if (combo) {
      setEditingCombo(combo);
      setFormData({
        name: combo.name,
        description: combo.description,
        price: combo.price,
        image_url: combo.image_url || '',
        category: combo.category,
        cinema_system_id: (typeof combo.cinema_system === 'object' && combo.cinema_system !== null) ? combo.cinema_system._id : (combo.cinema_system || ''),
        is_active: combo.is_active,
        is_popular: combo.is_popular,
      });
    } else {
      setEditingCombo(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        image_url: '',
        category: 'combo',
        cinema_system_id: '',
        is_active: true,
        is_popular: false,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCombo(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toastWarning('Vui lòng nhập tên combo!');
      return;
    }
    if (!formData.cinema_system_id) {
      toastWarning('Vui lòng chọn hệ thống rạp!');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      toastWarning('Vui lòng nhập giá hợp lệ!');
      return;
    }

    setSaving(true);
    try {
      const url = editingCombo
        ? `${API_URL}/combos/${editingCombo._id}`
        : `${API_URL}/combos`;

      const res = await fetch(url, {
        method: editingCombo ? 'PUT' : 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toastSuccess(editingCombo ? 'Cập nhật thành công!' : 'Thêm combo thành công!');
        closeModal();
        fetchCombos();
      } else {
        const error = await res.json();
        toastError(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Lỗi lưu combo:', error);
      toastError('Có lỗi xảy ra!');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (combo: ICombo) => {
    setDeleteTarget(combo);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/combos/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.ok) {
        toastSuccess('Xóa thành công!');
        fetchCombos();
        setIsConfirmOpen(false);
      } else {
        const error = await res.json();
        toastError(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Lỗi xóa:', error);
      toastError('Có lỗi xảy ra!');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (combo: ICombo) => {
    try {
      const res = await fetch(`${API_URL}/combos/${combo._id}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_active: !combo.is_active }),
      });

      if (res.ok) {
        fetchCombos();
      }
    } catch (error) {
      console.error('Lỗi toggle:', error);
    }
  };

  const handleTogglePopular = async (combo: ICombo) => {
    try {
      const res = await fetch(`${API_URL}/combos/${combo._id}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_popular: !combo.is_popular }),
      });

      if (res.ok) {
        fetchCombos();
      }
    } catch (error) {
      console.error('Lỗi toggle:', error);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'combo': return 'Combo';
      case 'snack': return 'Snack';
      case 'drink': return 'Nước uống';
      default: return cat;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'combo': return 'bg-orange-100 text-orange-700';
      case 'snack': return 'bg-yellow-100 text-yellow-700';
      case 'drink': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredCombos = combos.filter(combo => {
    const matchSearch = combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       combo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || combo.category === filterCategory;
    return matchSearch && matchCategory;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  const totalPages = Math.ceil(filteredCombos.length / itemsPerPage);
  const paginatedCombos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCombos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCombos, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Combo Bắp Nước</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý các combo bắp nước bán kèm vé xem phim</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm combo mới
        </button>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Tổng combo</p>
          <p className="text-2xl font-bold text-gray-800">{combos.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Đang bán</p>
          <p className="text-2xl font-bold text-green-600">
            {combos.filter(c => c.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Bán chạy</p>
          <p className="text-2xl font-bold text-orange-600">
            {combos.filter(c => c.is_popular).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Ngừng bán</p>
          <p className="text-2xl font-bold text-red-600">
            {combos.filter(c => !c.is_active).length}
          </p>
        </div>
      </div>

      
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm combo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Tất cả loại</option>
            <option value="combo">Combo</option>
            <option value="snack">Snack</option>
            <option value="drink">Nước uống</option>
          </select>
          <span className="text-sm text-gray-500 min-w-[120px] text-right whitespace-nowrap">
            Tổng: <strong>{filteredCombos.length}</strong> combo
          </span>
        </div>
      </div>

      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-[30%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Combo</th>
                <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Loại</th>
                <th className="w-[15%] px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Giá</th>
                <th className="w-[10%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Bán chạy</th>
                <th className="w-[10%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="w-[20%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCombos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterCategory ? 'Không tìm thấy combo phù hợp' : 'Chưa có combo nào'}
                  </td>
                </tr>
              ) : (
                paginatedCombos.map((combo) => (
                  <tr key={combo._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {combo.image_url ? (
                          <img
                            src={combo.image_url.startsWith('/') ? `${API_URL}${combo.image_url}` : combo.image_url}
                            alt={combo.name}
                            className="w-12 h-12 object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-semibold uppercase text-gray-500">
                            {combo.category === 'drink' ? 'Drink' : combo.category}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-800">{combo.name}</p>
                          <p className="text-xs text-blue-600 font-medium mb-1">
                             {(typeof combo.cinema_system === 'object' && combo.cinema_system !== null) ? combo.cinema_system.name : 'Chưa có Hãng Rạp'}
                          </p>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">{combo.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(combo.category)}`}>
                        {getCategoryLabel(combo.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-800">{formatCurrency(combo.price)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleTogglePopular(combo)}
                        className={`text-xs font-semibold transition ${combo.is_popular ? 'text-red-600' : 'text-gray-400'}`}
                        title={combo.is_popular ? 'Bỏ đánh dấu bán chạy' : 'Đánh dấu bán chạy'}
                      >
                        Bán chạy
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(combo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          combo.is_active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            combo.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(combo)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(combo)}
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

        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredCombos.length}
          itemsPerPage={itemsPerPage}
          onLimitChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      </div>

      
      <ConfirmModal
        open={isConfirmOpen}
        title="Xác nhận xóa combo"
        message={`Bạn có chắc chắn muốn xóa combo "${deleteTarget?.name}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingCombo ? 'Sửa combo' : 'Thêm combo mới'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hãng rạp <span className="text-red-500">*</span>
                </label>
                <select
                  name="cinema_system_id"
                  value={formData.cinema_system_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">-- Chọn hãng rạp --</option>
                  {cinemaSystems.map(system => (
                    <option key={system._id} value={system._id}>{system.name}</option>
                  ))}
                </select>
              </div>

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên combo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="VD: Combo Couple"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="VD: 1 Bắp lớn + 2 Nước lớn"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="89000"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="combo">Combo</option>
                    <option value="snack">Snack</option>
                    <option value="drink">Nước uống</option>
                  </select>
                </div>
              </div>

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh</label>
                <div className="flex items-center gap-4">
                  {formData.image_url && (
                    <img
                      src={formData.image_url.startsWith('/') ? `${API_URL}${formData.image_url}` : formData.image_url}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg shadow-sm"
                    />
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition ${uploading ? 'opacity-50' : ''}`}>
                      {uploading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-500">Đang upload...</span>
                        </div>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-500">Click để upload ảnh</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Đang bán</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_popular"
                    checked={formData.is_popular}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Bán chạy</span>
                </label>
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
                {saving ? 'Đang lưu...' : (editingCombo ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
