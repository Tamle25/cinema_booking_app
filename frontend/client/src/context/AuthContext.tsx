'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id?: string;      // ID từ MongoDB
  id?: string;       // Alias của _id
  full_name: string;
  email: string;
  role?: string;
  avatar_url?: string;
  availablePoints?: number;
  lifetimePoints?: number;
  membershipRank?: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
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
          // Gọi API để lấy thông tin user đầy đủ từ DB
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            // Lưu user vào localStorage để các trang khác có thể đọc
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // Token hết hạn hoặc không hợp lệ
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
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
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // Điều hướng theo role
    if (userData.role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/');
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...userData };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);