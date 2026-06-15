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

type ViewState = 'loading' | 'verifying' | 'success' | 'failed' | 'pending';

function statusToViewState(status?: string, fallbackSuccess?: boolean): ViewState {
  if (status === 'confirmed') return 'success';
  if (['failed', 'expired', 'cancelled'].includes(status || '')) return 'failed';
  if (status === 'pending') return 'pending';
  return fallbackSuccess ? 'success' : 'failed';
}

function MomoReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [retrying, setRetrying] = useState(false);

  const momoInfo = useMemo(
    () => ({
      amount: searchParams.get('amount') || '',
      orderId: searchParams.get('orderId') || '',
      transId: searchParams.get('transId') || '',
      resultCode: searchParams.get('resultCode') || '',
      message: searchParams.get('message') || '',
    }),
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    const processResult = async () => {
      // Dual-mode detection:
      // NEW MODE  — backend already settled and redirected here with pre-processed params
      //             (?success=true&bookingId=...&status=confirmed&...). Display immediately.
      // OLD MODE  — raw MoMo params (?orderId=...&signature=...): call backend to verify
      //             (backward-compat path for any direct navigation).
      const successParam = searchParams.get('success');
      const isNewMode = successParam !== null;

      if (isNewMode) {
        const success = successParam === 'true';
        const bookingId = searchParams.get('bookingId') || undefined;
        const status = searchParams.get('status') || undefined;
        const message = searchParams.get('message') || 'Xu ly thanh toan hoan tat.';
        const transactionId = searchParams.get('transactionId') || undefined;

        const preResult: PaymentResult = { success, message, bookingId, transactionId, status };
        setResult(preResult);

        if (!bookingId) {
          setViewState(success ? 'success' : 'failed');
          return;
        }

        // If status is already final, show immediately — no polling needed.
        if (status && status !== 'pending') {
          setViewState(statusToViewState(status, success));
          return;
        }

        // Status is pending or missing — poll for IPN confirmation (IPN may arrive
        // shortly after the return redirect when both run concurrently).
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
                transactionId: statusData.booking?.momo_trans_id || current?.transactionId,
                message:
                  liveStatus === 'confirmed'
                    ? 'Thanh toan thanh cong. Ve da duoc xac nhan.'
                    : current?.message || message,
              }));
              if (liveStatus !== 'pending') {
                setViewState(statusToViewState(liveStatus));
                return;
              }
            }
          } catch {
            // Non-fatal: keep polling
          }
        }

        if (!cancelled) setViewState(statusToViewState(status, success));
        return;
      }

      // Old mode: raw MoMo return params — verify via backend (backward compat).
      setViewState('verifying');
      const momoQueryString = window.location.search;

      try {
        const returnResponse = await fetch(
          `${API_URL}/payments/momo-return${momoQueryString}`,
        );
        const returnData: PaymentResult = await returnResponse.json();

        if (cancelled) return;
        setResult(returnData);

        if (!returnData.bookingId) {
          setViewState(returnData.success ? 'success' : 'failed');
          return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
          setViewState(statusToViewState(returnData.status, returnData.success));
          return;
        }

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const statusResponse = await fetch(
            `${API_URL}/payments/status/${returnData.bookingId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const status = statusData.status as string;

            if (cancelled) return;
            setResult((current) => ({
              ...(current || returnData),
              status,
              transactionId:
                statusData.booking?.momo_trans_id ||
                current?.transactionId ||
                returnData.transactionId,
              message:
                status === 'confirmed'
                  ? 'Thanh toan thanh cong. Ve da duoc xac nhan.'
                  : current?.message || returnData.message,
            }));

            if (status !== 'pending') {
              setViewState(statusToViewState(status));
              return;
            }
          }

          setViewState('pending');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (!cancelled) {
          setViewState('pending');
        }
      } catch (error) {
        console.error('MoMo return verify error:', error);
        if (!cancelled) {
          setResult({
            success: false,
            message: 'Khong the xac minh thanh toan. Vui long lien he ho tro.',
          });
          setViewState('failed');
        }
      }
    };

    processResult();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const formatAmount = (amount: string) => {
    const value = Number.parseInt(amount || '0', 10);
    return Number.isNaN(value) ? '0' : value.toLocaleString('vi-VN');
  };

  const handleRetryPayment = async () => {
    if (!result?.bookingId) {
      toastWarning('Khong tim thay ma dat ve de thanh toan lai.');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      toastWarning('Ban can dang nhap de thanh toan.');
      router.push('/login');
      return;
    }

    setRetrying(true);
    try {
      const response = await fetch(`${API_URL}/payments/retry`, {
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

      toastError(data.message || 'Khong the tao lai thanh toan.');
      setRetrying(false);
    } catch (error) {
      console.error('Retry MoMo payment error:', error);
      toastError('Co loi xay ra, vui long thu lai.');
      setRetrying(false);
    }
  };

  const isSuccess = viewState === 'success';
  const isPending = viewState === 'loading' || viewState === 'verifying' || viewState === 'pending';

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-pink-600 mx-auto mb-5" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Dang xac minh thanh toan</h1>
          <p className="text-gray-600">
            He thong dang cho IPN tu MoMo va kiem tra trang thai ve moi nhat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className={`px-6 py-8 text-center ${isSuccess ? 'bg-green-600' : 'bg-red-600'}`}>
          <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4">
            <span className={`text-5xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
              {isSuccess ? 'OK' : 'X'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isSuccess ? 'Thanh Toan Thanh Cong' : 'Thanh Toan Chua Hoan Tat'}
          </h1>
        </div>

        <div className="px-6 py-8">
          <p className="text-center text-gray-600 mb-6">{result?.message}</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            {result?.bookingId && (
              <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                <span className="text-gray-500">Ma dat ve:</span>
                <span className="font-semibold text-gray-900 text-right break-all">{result.bookingId}</span>
              </div>
            )}
            {(result?.transactionId || momoInfo.transId) && (
              <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                <span className="text-gray-500">Ma giao dich:</span>
                <span className="font-semibold text-gray-900 text-right break-all">
                  {result?.transactionId || momoInfo.transId}
                </span>
              </div>
            )}
            {momoInfo.orderId && (
              <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                <span className="text-gray-500">OrderId:</span>
                <span className="font-semibold text-gray-900 text-right break-all">{momoInfo.orderId}</span>
              </div>
            )}
            {momoInfo.amount && (
              <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                <span className="text-gray-500">So tien:</span>
                <span className="font-semibold text-pink-600">{formatAmount(momoInfo.amount)} VND</span>
              </div>
            )}
            {result?.status && (
              <div className="flex justify-between gap-4 py-2">
                <span className="text-gray-500">Trang thai:</span>
                <span className="font-semibold text-gray-900">{result.status}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {isSuccess ? (
              <>
                <Link
                  href="/my-tickets"
                  className="block w-full bg-pink-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-pink-700 transition-colors"
                >
                  Xem Ve Cua Toi
                </Link>
                <Link
                  href="/"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Ve Trang Chu
                </Link>
              </>
            ) : (
              <>
                {result?.bookingId && (
                  <button
                    onClick={handleRetryPayment}
                    disabled={retrying}
                    className="block w-full bg-pink-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50"
                  >
                    {retrying ? 'Dang tao thanh toan moi...' : 'Thanh Toan Lai'}
                  </button>
                )}
                <Link
                  href="/"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Ve Trang Chu
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MomoReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-pink-600" />
        </div>
      }
    >
      <MomoReturnContent />
    </Suspense>
  );
}
