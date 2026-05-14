export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

export const authHeaders = (headers?: HeadersInit): HeadersInit => {
  const token = getAccessToken();
  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
