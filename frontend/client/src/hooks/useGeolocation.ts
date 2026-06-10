'use client';

import { useState, useCallback } from 'react';

interface GeolocationState {
  coords: { lat: number; lng: number } | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'error';
  errorMessage: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    status: 'idle',
    errorMessage: null,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        coords: null,
        status: 'unsupported',
        errorMessage: 'Trình duyệt của bạn không hỗ trợ định vị.',
      });
      return;
    }

    setState(prev => ({ ...prev, status: 'requesting', errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          status: 'granted',
          errorMessage: null,
        });
      },
      (error) => {
        let errorMessage = 'Không thể lấy vị trí.';
        let status: GeolocationState['status'] = 'error';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Bạn đã từ chối quyền truy cập vị trí.';
            status = 'denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Không thể xác định vị trí hiện tại.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Hết thời gian lấy vị trí.';
            break;
        }

        setState({
          coords: null,
          status,
          errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, []);

  const clearLocation = useCallback(() => {
    setState({
      coords: null,
      status: 'idle',
      errorMessage: null,
    });
  }, []);

  return {
    coords: state.coords,
    status: state.status,
    errorMessage: state.errorMessage,
    requestLocation,
    clearLocation,
    hasLocation: state.coords !== null,
  };
}
