'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  full_name: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra xem đã đăng nhập chưa khi F5 trang
    const checkLogin = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Gọi API để lấy thông tin user từ token
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          } else {
            // Token hết hạn hoặc không hợp lệ
            localStorage.removeItem('access_token');
          }
        } catch (error) {
          console.error('Lỗi xác thực:', error);
        }
      }
      setLoading(false);
    };
    checkLogin();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('access_token', token);
    setUser(userData);
    router.push('/'); 
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);