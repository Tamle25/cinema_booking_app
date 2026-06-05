'use client';

import { useState, useEffect, useMemo } from 'react';
import { toastSuccess, toastError } from '@/utils/toast';
import { authHeaders, API_URL } from '@/lib/api';
import Pagination from '@/components/Pagination';
import type { IVoucher } from '@/types';

interface ICinema {
  _id: string;
  name: string;
}

interface IUsageHistory {
  _id: string;
  user: {
    full_name: string;
    email: string;
  };
  discountAmount: number;
  order: string;
  createdAt: string;
}

export default function AdminVouchersPage() {
  const [activeTab, setActiveTab] = useState<'ADMIN_CODE' | 'POINT_EXCHANGE_TEMPLATE'>('ADMIN_CODE');
  const [vouchers, setVouchers] = useState<IVoucher[]>([]);
  const [cinemas, setCinemas] = useState<ICinema[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal create/edit states
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<IVoucher | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED_AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState(0);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(0);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(true);
  const [status, setStatus] = useState('active');
  const [isAllCinemas, setIsAllCinemas] = useState(true);
  const [applicableCinemaIds, setApplicableCinemaIds] = useState<string[]>([]);
  const [requiredMembershipRank, setRequiredMembershipRank] = useState('Member');
  const [requiredPoints, setRequiredPoints] = useState(0);
  const [validDaysAfterExchange, setValidDaysAfterExchange] = useState(30);
  const [exchangeLimit, setExchangeLimit] = useState(0);

  // Usage history modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<IVoucher | null>(null);
  const [usageHistory, setUsageHistory] = useState<IUsageHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchVouchers();
    fetchCinemas();
  }, [activeTab]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/vouchers/admin/list?voucherType=${activeTab}&limit=200`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setVouchers(data.vouchers || data || []);
      } else {
        toastError('Lỗi tải danh sách voucher');
      }
    } catch (error) {
      toastError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const fetchCinemas = async () => {
    try {
      const res = await fetch(`${API_URL}/cinemas`);
      if (res.ok) {
        const data = await res.json();
        setCinemas(data || []);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách rạp:', error);
    }
  };

  // Filter
  const filteredVouchers = vouchers.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, activeTab]);

  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);
  const paginatedVouchers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVouchers.slice(start, start + itemsPerPage);
  }, [filteredVouchers, currentPage, itemsPerPage]);

  // Open create modal
  const openCreateModal = () => {
    setEditingVoucher(null);
    setName('');
    setCode('');
    setDescription('');
    setDiscountType('PERCENT');
    setDiscountValue(0);
    setMaxDiscountAmount(0);
    setMinOrderAmount(0);
    setStartDate('');
    setEndDate('');
    setUsageLimit(0);
    setIsUnlimited(true);
    setStatus('active');
    setIsAllCinemas(true);
    setApplicableCinemaIds([]);
    setRequiredMembershipRank('Member');
    setRequiredPoints(0);
    setValidDaysAfterExchange(30);
    setExchangeLimit(0);
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (voucher: IVoucher) => {
    setEditingVoucher(voucher);
    setName(voucher.name || '');
    setCode(voucher.code || '');
    setDescription(voucher.description || '');
    setDiscountType(voucher.discountType || 'PERCENT');
    setDiscountValue(voucher.discountValue || 0);
    setMaxDiscountAmount(voucher.maxDiscountAmount || 0);
    setMinOrderAmount(voucher.minOrderAmount || 0);
    if (voucher.startDate) {
      setStartDate(new Date(voucher.startDate).toISOString().split('T')[0]);
    } else {
      setStartDate('');
    }
    if (voucher.endDate) {
      setEndDate(new Date(voucher.endDate).toISOString().split('T')[0]);
    } else {
      setEndDate('');
    }
    setUsageLimit(voucher.usageLimit || 0);
    setIsUnlimited(voucher.isUnlimited !== false);
    setStatus(voucher.status || 'active');
    setIsAllCinemas(voucher.isAllCinemas !== false);
    const cinemaIds = voucher.applicableCinemaIds?.map((c: any) => typeof c === 'object' ? c._id : c) || [];
    setApplicableCinemaIds(cinemaIds);
    setRequiredMembershipRank(voucher.requiredMembershipRank || 'Member');
    setRequiredPoints(voucher.requiredPoints || 0);
    setValidDaysAfterExchange(voucher.validDaysAfterExchange || 30);
    setExchangeLimit(voucher.exchangeLimit || 0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVoucher(null);
  };

  // Toggle status
  const handleToggleStatus = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/vouchers/admin/${id}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (res.ok) {
        toastSuccess('Cập nhật trạng thái thành công!');
        fetchVouchers();
      } else {
        toastError('Lỗi cập nhật trạng thái');
      }
    } catch (error) {
      toastError('Không thể kết nối đến server');
    }
  };

  // Delete
  const handleDelete = async (voucher: IVoucher) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa voucher "${voucher.name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/vouchers/admin/${voucher._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        toastSuccess('Xóa voucher thành công!');
        fetchVouchers();
      } else {
        const err = await res.json();
        toastError(err.message || 'Không thể xóa voucher đã sử dụng');
      }
    } catch (error) {
      toastError('Không thể kết nối đến server');
    }
  };

  // Save (create or edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('Tên voucher không được để trống');
      return;
    }
    if (activeTab === 'ADMIN_CODE' && !code.trim()) {
      toastError('Mã code không được để trống');
      return;
    }

    setSaving(true);

    const payload: any = {
      name,
      description,
      voucherType: activeTab,
      discountType,
      discountValue,
      minOrderAmount,
      isUnlimited,
      usageLimit: isUnlimited ? 0 : usageLimit,
      isAllCinemas,
      applicableCinemaIds: isAllCinemas ? [] : applicableCinemaIds,
      requiredMembershipRank,
    };

    // Chỉ gửi status khi edit, khi tạo mới để backend tự gán mặc định 'active'
    if (editingVoucher) {
      payload.status = status;
    }

    if (activeTab === 'ADMIN_CODE') {
      payload.code = code.trim().toUpperCase();
      if (startDate) payload.startDate = new Date(startDate).toISOString();
      if (endDate) payload.endDate = new Date(endDate).toISOString();
    } else {
      payload.requiredPoints = requiredPoints;
      payload.validDaysAfterExchange = validDaysAfterExchange;
      payload.exchangeLimit = exchangeLimit;
    }

    if (discountType === 'PERCENT') {
      payload.maxDiscountAmount = maxDiscountAmount;
    }

    try {
      let res;
      if (editingVoucher) {
        res = await fetch(`${API_URL}/vouchers/admin/${editingVoucher._id}`, {
          method: 'PUT',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
      } else {
        const endpoint = activeTab === 'ADMIN_CODE' ? 'create' : 'create-template';
        res = await fetch(`${API_URL}/vouchers/admin/${endpoint}`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        toastSuccess(editingVoucher ? 'Cập nhật voucher thành công!' : 'Tạo voucher thành công!');
        closeModal();
        fetchVouchers();
      } else {
        toastError(data.message || 'Lỗi lưu voucher');
      }
    } catch (error) {
      toastError('Không thể kết nối đến server');
    } finally {
      setSaving(false);
    }
  };

  // Usage history
  const openHistoryModal = async (voucher: IVoucher) => {
    setSelectedVoucher(voucher);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/vouchers/admin/usage-history?voucherId=${voucher._id}&limit=100`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsageHistory(data.usages || data || []);
      }
    } catch (error) {
      console.error('Lỗi tải lịch sử sử dụng:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCinemaCheckboxChange = (cinemaId: string) => {
    setApplicableCinemaIds(prev =>
      prev.includes(cinemaId)
        ? prev.filter(id => id !== cinemaId)
        : [...prev, cinemaId]
    );
  };

  // Helpers
  const colCount = activeTab === 'ADMIN_CODE' ? 8 : 8;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Voucher & Khuyến mãi</h1>
          <p className="text-gray-500 text-sm mt-1">Cấu hình mã giảm giá nhập mã hoặc mẫu voucher đổi bằng điểm thành viên</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {activeTab === 'ADMIN_CODE' ? 'Tạo mã Voucher' : 'Tạo mẫu đổi điểm'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Tổng voucher</p>
          <p className="text-2xl font-bold text-gray-800">{vouchers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Đang hoạt động</p>
          <p className="text-2xl font-bold text-green-600">{vouchers.filter(v => v.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Tạm dừng</p>
          <p className="text-2xl font-bold text-amber-600">{vouchers.filter(v => v.status === 'inactive').length}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Tabs inline */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('ADMIN_CODE')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'ADMIN_CODE'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Voucher nhập mã
            </button>
            <button
              onClick={() => setActiveTab('POINT_EXCHANGE_TEMPLATE')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'POINT_EXCHANGE_TEMPLATE'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mẫu đổi điểm
            </button>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm voucher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm dừng</option>
          </select>
          <span className="text-sm text-gray-500 min-w-[120px] text-right whitespace-nowrap">
            Tổng: <strong>{filteredVouchers.length}</strong> voucher
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-[22%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Voucher</th>
                {activeTab === 'ADMIN_CODE' && (
                  <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã code</th>
                )}
                <th className="w-[14%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Giá trị giảm</th>
                {activeTab === 'POINT_EXCHANGE_TEMPLATE' && (
                  <th className="w-[10%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Điểm đổi</th>
                )}
                <th className="w-[11%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Lượt dùng</th>
                <th className="w-[10%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hạng</th>
                <th className="w-[12%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="w-[14%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterStatus ? 'Không tìm thấy voucher phù hợp' : 'Chưa có voucher nào. Hãy tạo voucher mới!'}
                  </td>
                </tr>
              ) : (
                paginatedVouchers.map((voucher) => (
                  <tr key={voucher._id} className="hover:bg-gray-50 transition">
                    {/* Name + description */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{voucher.name}</p>
                        {voucher.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{voucher.description}</p>
                        )}
                      </div>
                    </td>

                    {/* Code (only ADMIN_CODE) */}
                    {activeTab === 'ADMIN_CODE' && (
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono font-bold bg-gray-100 text-gray-800 border border-gray-200 uppercase">
                          {voucher.code}
                        </span>
                      </td>
                    )}

                    {/* Discount value */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-800">
                        {voucher.discountType === 'PERCENT'
                          ? `${voucher.discountValue}%`
                          : `${voucher.discountValue.toLocaleString()}đ`}
                      </span>
                      {voucher.discountType === 'PERCENT' && voucher.maxDiscountAmount > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">Tối đa {voucher.maxDiscountAmount.toLocaleString()}đ</p>
                      )}
                    </td>

                    {/* Points (only POINT_EXCHANGE_TEMPLATE) */}
                    {activeTab === 'POINT_EXCHANGE_TEMPLATE' && (
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {voucher.requiredPoints?.toLocaleString()} pts
                        </span>
                      </td>
                    )}

                    {/* Usage count */}
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700">
                        {activeTab === 'ADMIN_CODE'
                          ? `${voucher.usedCount}/${voucher.isUnlimited ? '∞' : voucher.usageLimit}`
                          : `${voucher.exchangedCount}/${voucher.exchangeLimit || '∞'}`}
                      </span>
                    </td>

                    {/* Rank */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {voucher.requiredMembershipRank}+
                      </span>
                    </td>

                    {/* Status toggle */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(voucher._id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          voucher.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={voucher.status === 'active' ? 'Đang hoạt động — Bấm để tắt' : 'Tạm dừng — Bấm để bật'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            voucher.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openHistoryModal(voucher)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Lịch sử sử dụng"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(voucher)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(voucher)}
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

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredVouchers.length}
          itemsPerPage={itemsPerPage}
          onLimitChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE & EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingVoucher
                  ? `Cập nhật: ${editingVoucher.name}`
                  : activeTab === 'ADMIN_CODE'
                  ? 'Tạo mã Voucher Admin mới'
                  : 'Tạo mẫu Voucher đổi điểm mới'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tên voucher */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Voucher *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Giảm giá hè rực rỡ"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                {/* Mã Code (chỉ hiện với ADMIN_CODE) */}
                {activeTab === 'ADMIN_CODE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã Code *</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="VD: SUMMERSALE"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono uppercase placeholder:text-gray-400"
                    />
                  </div>
                )}

                {/* Mô tả */}
                <div className={activeTab === 'ADMIN_CODE' ? '' : 'md:col-span-2'}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Điều kiện áp dụng voucher..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                {/* Loại giảm giá */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại giảm giá</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="PERCENT">Phần trăm (%)</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định (đ)</option>
                  </select>
                </div>

                {/* Giá trị giảm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị giảm *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                {/* Giảm tối đa (chỉ hiện cho PERCENT) */}
                {discountType === 'PERCENT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mức giảm tối đa (đ)</label>
                    <input
                      type="number"
                      min={0}
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                )}

                {/* Đơn hàng tối thiểu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn hàng tối thiểu (đ)</label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                {/* Bắt đầu và Kết thúc (chỉ hiện cho ADMIN_CODE) */}
                {activeTab === 'ADMIN_CODE' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </>
                )}

                {/* Yêu cầu điểm + Hạn ngày sử dụng (chỉ hiện cho POINT_EXCHANGE_TEMPLATE) */}
                {activeTab === 'POINT_EXCHANGE_TEMPLATE' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điểm cần đổi *</label>
                      <input
                        type="number"
                        required
                        min={10}
                        value={requiredPoints}
                        onChange={(e) => setRequiredPoints(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số ngày hiệu lực sau đổi *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={validDaysAfterExchange}
                        onChange={(e) => setValidDaysAfterExchange(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </>
                )}

                {/* Hạng thành viên tối thiểu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hạng thành viên tối thiểu</label>
                  <select
                    value={requiredMembershipRank}
                    onChange={(e) => setRequiredMembershipRank(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="Member">Member (Đồng)</option>
                    <option value="Silver">Silver (Bạc)</option>
                    <option value="Gold">Gold (Vàng)</option>
                    <option value="Platinum">Platinum (Bạch kim)</option>
                    <option value="Diamond">Diamond (Kim cương)</option>
                  </select>
                </div>

                {/* Giới hạn sử dụng */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlimited}
                      onChange={(e) => setIsUnlimited(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Không giới hạn lượt sử dụng</span>
                  </label>
                  {!isUnlimited && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn số lượng (lượt)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={usageLimit}
                        onChange={(e) => setUsageLimit(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  )}
                </div>

                {/* Giới hạn rạp áp dụng */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllCinemas}
                      onChange={(e) => setIsAllCinemas(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Áp dụng cho tất cả rạp chiếu</span>
                  </label>
                  {!isAllCinemas && (
                    <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-40 overflow-y-auto space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Chọn rạp áp dụng:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cinemas.map((cinema) => (
                          <label key={cinema._id} className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={applicableCinemaIds.includes(cinema._id)}
                              onChange={() => handleCinemaCheckboxChange(cinema._id)}
                              className="w-4 h-4 text-blue-600 rounded mr-2"
                            />
                            {cinema.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Trạng thái kích hoạt - chỉ hiện khi chỉnh sửa */}
                {editingVoucher && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="active">Active (Hoạt động)</option>
                      <option value="inactive">Inactive (Tạm ngưng)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : editingVoucher ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USAGE HISTORY MODAL */}
      {showHistoryModal && selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Lịch sử sử dụng: {selectedVoucher.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">Danh sách lượt người dùng đã áp dụng mã giảm giá này</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : usageHistory.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Người dùng</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã đơn hàng</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tiền giảm</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày áp dụng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usageHistory.map((history) => (
                      <tr key={history._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-3">
                          <p className="font-semibold text-gray-800 text-sm">{history.user?.full_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{history.user?.email || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-gray-700 font-mono">#{typeof history.order === 'string' ? history.order.slice(-8) : history.order}</span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            -{history.discountAmount?.toLocaleString()}đ
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-gray-500">
                          {new Date(history.createdAt).toLocaleDateString('vi-VN')} {new Date(history.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500">
                  Voucher này chưa từng được sử dụng.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
