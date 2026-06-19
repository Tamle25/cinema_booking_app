'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { toastError, toastWarning } from '@/utils/toast';

interface PaymentResult {
  success: boolean;
  message: string;
  bookingId?: string;
  transactionId?: string;
  status?: string;
}

type ViewState = 'loading' | 'success' | 'failed' | 'pending';

function statusToViewState(status?: string, fallbackSuccess?: boolean): ViewState {
  if (status === 'confirmed') return 'success';
  if (['failed', 'expired', 'cancelled'].includes(status || '')) return 'failed';
  if (status === 'pending') return 'pending';
  return fallbackSuccess ? 'success' : 'failed';
}

function VnpayReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [retrying, setRetrying] = useState(false);

  // Backend đã settle xong và redirect về đây với param đã xử lý sẵn.
  const amount = useMemo(() => searchParams.get('amount') || '', [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const processResult = async () => {
      const successParam = searchParams.get('success');
      const success = successParam === 'true';
      const bookingId = searchParams.get('bookingId') || undefined;
      const status = searchParams.get('status') || undefined;
      const message =
        searchParams.get('message') || 'Xử lý thanh toán hoàn tất.';
      const transactionId = searchParams.get('transactionId') || undefined;

      const preResult: PaymentResult = {
        success,
        message,
        bookingId,
        transactionId,
        status,
      };
      setResult(preResult);

      if (!bookingId) {
        setViewState(success ? 'success' : 'failed');
        return;
      }

      // Trạng thái đã chốt -> hiển thị ngay, không cần polling.
      if (status && status !== 'pending') {
        setViewState(statusToViewState(status, success));
        return;
      }

      // pending hoặc thiếu -> poll vài lần chờ IPN xác nhận.
      setViewState('pending');
      const token = localStorage.getItem('access_token');
      if (!token) {
        setViewState(statusToViewState(status, success));
        return;
      }

      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (cancelled) return;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (cancelled) return;

        try {
          const statusResponse = await fetch(
            `${API_URL}/payments/status/${bookingId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const liveStatus = statusData.status as string;
            if (cancelled) return;
            setResult((current) => ({
              ...(current || preResult),
              status: liveStatus,
              transactionId:
                statusData.booking?.vnpay_trans_no || current?.transactionId,
              message:
                liveStatus === 'confirmed'
                  ? 'Thanh toán thành công. Vé đã được xác nhận.'
                  : current?.message || message,
            }));
            if (liveStatus !== 'pending') {
              setViewState(statusToViewState(liveStatus));
              return;
            }
          }
        } catch {
          // Non-fatal: tiếp tục poll
        }
      }

      if (!cancelled) setViewState(statusToViewState(status, success));
    };

    processResult();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const formatAmount = (value: string) => {
    // VNPAY trả vnp_Amount đã nhân 100 -> chia lại để hiển thị.
    const num = Number.parseInt(value || '0', 10);
    if (Number.isNaN(num)) return '0';
    return Math.round(num / 100).toLocaleString('vi-VN');
  };

  const handleRetryPayment = async () => {
    if (!result?.bookingId) {
      toastWarning('Không tìm thấy mã đặt vé để thanh toán lại.');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      toastWarning('Bạn cần đăng nhập để thanh toán.');
      router.push('/login');
      return;
    }

    setRetrying(true);
    try {
      const response = await fetch(`${API_URL}/payments/retry-vnpay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: result.bookingId }),
      });
      const data = await response.json();

      if (response.ok && data.payUrl) {
        window.location.href = data.payUrl;
        return;
      }

      toastError(data.message || 'Không thể tạo lại thanh toán.');
      setRetrying(false);
    } catch (error) {
      console.error('Retry VNPAY payment error:', error);
      toastError('Có lỗi xảy ra, vui lòng thử lại.');
      setRetrying(false);
    }
  };

  const isSuccess = viewState === 'success';
  const isPending = viewState === 'loading' || viewState === 'pending';

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-blue-600 mx-auto mb-5" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Đang xác minh thanh toán
          </h1>
          <p className="text-gray-600">
            Hệ thống đang chờ xác nhận từ VNPAY và kiểm tra trạng thái vé mới nhất.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div
          className={`px-6 py-8 text-center ${isSuccess ? 'bg-green-600' : 'bg-red-600'}`}
        >
          <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4">
            <span
              className={`text-5xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
            >
              {isSuccess ? 'OK' : 'X'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isSuccess ? 'Thanh Toán Thành Công' : 'Thanh Toán Chưa Hoàn Tất'}
          </h1>
        </div>

        <div className="px-6 py-8">
          <p className="text-center text-gray-600 mb-6">{result?.message}</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            {result?.bookingId && (
              <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                <span className="text-gray-500">Mã đặt vé:</span>
                <span className="font-semibold text-gray-900 text-right break-all">
                  {result.bookingId}
                </span>
              </div>
            )}
            {result?.transactionId && (
              <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                <span className="text-gray-500">Mã giao dịch VNPAY:</span>
                <span className="font-semibold text-gray-900 text-right break-all">
                  {result.transactionId}
                </span>
              </div>
            )}
            {amount && (
              <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                <span className="text-gray-500">Số tiền:</span>
                <span className="font-semibold text-blue-600">
                  {formatAmount(amount)} VND
                </span>
              </div>
            )}
            {result?.status && (
              <div className="flex justify-between gap-4 py-2">
                <span className="text-gray-500">Trạng thái:</span>
                <span className="font-semibold text-gray-900">
                  {result.status}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {isSuccess ? (
              <>
                <Link
                  href="/my-tickets"
                  className="block w-full bg-blue-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Xem vé của tôi
                </Link>
                <Link
                  href="/"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Về Trang Chủ
                </Link>
              </>
            ) : (
              <>
                {result?.bookingId && (
                  <button
                    onClick={handleRetryPayment}
                    disabled={retrying}
                    className="block w-full bg-blue-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {retrying ? 'Đang tạo thanh toán mới...' : 'Thanh Toán Lại'}
                  </button>
                )}
                <Link
                  href="/"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Về Trang Chủ
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VnpayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-blue-600" />
        </div>
      }
    >
      <VnpayReturnContent />
    </Suspense>
  );
}
