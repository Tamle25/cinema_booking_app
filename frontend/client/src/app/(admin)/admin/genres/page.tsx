'use client';

import { useEffect, useState } from 'react';
import { IGenre } from '@/types/index';
import { authHeaders, API_URL } from '@/lib/api';
import { toastSuccess, toastError } from '@/utils/toast';
import { getErrorMessage, getResponseMessage } from '@/utils/errorMessage';
import ConfirmModal from '@/components/ConfirmModal';

export default function GenreListPage() {
  const [genres, setGenres] = useState<IGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedGenre, setSelectedGenre] = useState<IGenre | null>(null);
  const [genreName, setGenreName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API_URL}/genres`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Không tải được danh sách thể loại');
      const data = await res.json();
      setGenres(data);
    } catch (error) {
      console.error(error);
      toastError(getErrorMessage(error, 'Lỗi tải thể loại'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const openModal = (mode: 'create' | 'edit', genre: IGenre | null = null) => {
    setModalMode(mode);
    setSelectedGenre(genre);
    setGenreName(genre ? genre.name : '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGenre(null);
    setGenreName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genreName.trim()) {
      toastError('Tên thể loại không được để trống');
      return;
    }

    setSubmitLoading(true);
    try {
      const url = modalMode === 'create' 
        ? `${API_URL}/genres` 
        : `${API_URL}/genres/${selectedGenre?._id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ name: genreName.trim() }),
      });

      const data = await res.json() as { message?: unknown };

      if (!res.ok) {
        throw new Error(getResponseMessage(data.message, 'Lỗi khi lưu thể loại'));
      }

      toastSuccess(modalMode === 'create' ? 'Thêm thể loại thành công!' : 'Cập nhật thể loại thành công!');
      closeModal();
      fetchGenres();
    } catch (error) {
      toastError(getErrorMessage(error, 'Có lỗi xảy ra'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/genres/${id}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: unknown };
        throw new Error(getResponseMessage(data.message, 'Lỗi khi cập nhật trạng thái'));
      }
      toastSuccess('Cập nhật trạng thái thành công!');
      fetchGenres();
    } catch (error) {
      toastError(getErrorMessage(error, 'Cập nhật trạng thái thất bại'));
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/genres/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await res.json() as { message?: unknown };

      if (!res.ok) {
        throw new Error(getResponseMessage(data.message, 'Lỗi khi xóa thể loại'));
      }

      toastSuccess('Xóa thể loại thành công!');
      fetchGenres();
      setIsConfirmOpen(false);
    } catch (error) {
      toastError(getErrorMessage(error, 'Xóa thất bại'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGenres = genres.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.slug.toLowerCase().includes(searchTerm.toLowerCase())
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
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Thể loại phim</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý danh mục thể loại phim cho hệ thống</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm thể loại mới
        </button>
      </div>

      
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
          />
        </div>
      </div>

      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] table-fixed">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-[30%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên thể loại</th>
                <th className="w-[25%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug (Auto)</th>
                <th className="w-[15%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="w-[15%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                <th className="w-[15%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGenres.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'Không tìm thấy thể loại phù hợp' : 'Chưa có thể loại nào'}
                  </td>
                </tr>
              ) : (
                filteredGenres.map((genre) => (
                  <tr key={genre._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-800">{genre.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {genre.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(genre._id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          genre.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            genre.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-500">
                        {new Date(genre.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('edit', genre)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(genre._id, genre.name)}
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
      </div>

      
      <ConfirmModal
        open={isConfirmOpen}
        title="Xác nhận xóa thể loại"
        message={`Bạn có chắc chắn muốn xóa thể loại "${deleteTarget?.name}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {modalMode === 'create' ? 'Thêm thể loại mới' : 'Chỉnh sửa thể loại'}
              </h3>
              <button 
                onClick={closeModal} 
                className="text-slate-400 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Tên thể loại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={genreName}
                    onChange={(e) => setGenreName(e.target.value)}
                    placeholder="Nhập tên thể loại (VD: Hành động)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitLoading}
                    required
                  />
                  {modalMode === 'edit' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Lưu ý: Slug của thể loại sẽ được tự động cập nhật lại dựa trên tên mới.
                    </p>
                  )}
                </div>
              </div>

              
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition font-medium text-sm"
                  disabled={submitLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm flex items-center gap-2"
                  disabled={submitLoading}
                >
                  {submitLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {modalMode === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
