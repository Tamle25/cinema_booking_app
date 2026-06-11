'use client';

import SafeImage from '@/components/SafeImage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { INews } from '@/types';
import Pagination from '@/components/Pagination';
import { authHeaders } from '@/lib/api';
import { toastError, toastWarning, toastSuccess } from '@/utils/toast';
import ConfirmModal from '@/components/ConfirmModal';

const emptyForm = {
  title: '',
  slug: '',
  shortDescription: '',
  content: '',
  thumbnail: '',
  isPublished: true,
};

export default function AdminNewsPage() {
  const [newsList, setNewsList] = useState<INews[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<INews | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState(emptyForm);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<INews | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/news/admin/all`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setNewsList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi tải tin tức:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const payload = new FormData();
      payload.append('image', file);

      const res = await fetch(`${API_URL}/news/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: payload,
      });

      const data = await res.json();
      if (data.thumbnail) {
        setFormData((prev) => ({ ...prev, thumbnail: data.thumbnail }));
      } else {
        toastError('Upload ảnh thất bại');
      }
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      toastError('Upload ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  const openModal = (news?: INews) => {
    if (news) {
      setEditingNews(news);
      setFormData({
        title: news.title,
        slug: news.slug,
        shortDescription: news.shortDescription,
        content: news.content,
        thumbnail: news.thumbnail || '',
        isPublished: news.isPublished,
      });
    } else {
      setEditingNews(null);
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNews(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.shortDescription.trim() || !formData.content.trim()) {
      toastWarning('Vui lòng nhập đầy đủ tiêu đề, mô tả ngắn và nội dung');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editingNews ? `${API_URL}/news/${editingNews._id}` : `${API_URL}/news`,
        {
          method: editingNews ? 'PUT' : 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            ...formData,
            slug: formData.slug.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        toastError(error.message || 'Lưu tin tức thất bại');
        return;
      }

      closeModal();
      fetchNews();
    } catch (error) {
      console.error('Lỗi lưu tin tức:', error);
      toastError('Lưu tin tức thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (news: INews) => {
    setDeleteTarget(news);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/news/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.ok) {
        toastSuccess('Xóa tin tức thành công!');
        fetchNews();
        setIsConfirmOpen(false);
      } else {
        const error = await res.json();
        toastError(error.message || 'Xóa tin tức thất bại');
      }
    } catch (error) {
      console.error('Lỗi xóa tin tức:', error);
      toastError('Xóa tin tức thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (news: INews) => {
    try {
      const res = await fetch(`${API_URL}/news/${news._id}/publish`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ isPublished: !news.isPublished }),
      });

      if (res.ok) {
        fetchNews();
      }
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
    }
  };

  const filteredNews = newsList.filter((news) => {
    const keyword = searchTerm.toLowerCase();
    const matchSearch =
      news.title.toLowerCase().includes(keyword) ||
      news.shortDescription.toLowerCase().includes(keyword);
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'published' && news.isPublished) ||
      (statusFilter === 'draft' && !news.isPublished);
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const paginatedNews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNews.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNews, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý tin tức</h1>
          <p className="text-gray-500 text-sm mt-1">Tạo, cập nhật và xuất bản tin tức cho website</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm tin tức
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Tổng bài viết</p>
          <p className="text-2xl font-bold text-gray-800">{newsList.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Đã xuất bản</p>
          <p className="text-2xl font-bold text-green-600">{newsList.filter((item) => item.isPublished).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Bản nháp</p>
          <p className="text-2xl font-bold text-amber-600">{newsList.filter((item) => !item.isPublished).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[220px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm tin tức..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
          <span className="text-sm text-gray-500 min-w-[120px] text-right whitespace-nowrap">
            Tổng: <strong>{filteredNews.length}</strong> bài
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[920px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-[42%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tin tức</th>
                <th className="w-[16%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="w-[14%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày đăng</th>
                <th className="w-[12%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Xuất bản</th>
                <th className="w-[16%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedNews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || statusFilter ? 'Không tìm thấy bài viết phù hợp' : 'Chưa có tin tức nào'}
                  </td>
                </tr>
              ) : (
                paginatedNews.map((news) => (
                  <tr key={news._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {news.thumbnail ? (
                            <SafeImage
                              src={news.thumbnail.startsWith('/') ? `${API_URL}${news.thumbnail}` : news.thumbnail}
                              alt={news.title}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 line-clamp-2">{news.title}</p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{news.shortDescription}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 break-all">{news.slug}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-700">
                      {new Date(news.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleTogglePublish(news)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          news.isPublished ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            news.isPublished ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(news)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(news)}
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
          totalItems={filteredNews.length}
          itemsPerPage={itemsPerPage}
          onLimitChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      </div>

      <ConfirmModal
        open={isConfirmOpen}
        title="Xác nhận xóa tin tức"
        message={`Bạn có chắc chắn muốn xóa bài viết "${deleteTarget?.title}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingNews ? 'Cập nhật tin tức' : 'Thêm tin tức mới'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="Để trống để hệ thống tự tạo"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung chi tiết</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh đại diện</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-52 h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {formData.thumbnail ? (
                      <SafeImage
                        src={formData.thumbnail.startsWith('/') ? `${API_URL}${formData.thumbnail}` : formData.thumbnail}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-gray-400">Chưa có ảnh</span>
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className={`h-full min-h-32 border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-center hover:border-blue-400 transition ${uploading ? 'opacity-50' : ''}`}>
                      {uploading ? 'Đang upload...' : 'Chọn ảnh thumbnail'}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Xuất bản ngay sau khi lưu</span>
              </label>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : editingNews ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
