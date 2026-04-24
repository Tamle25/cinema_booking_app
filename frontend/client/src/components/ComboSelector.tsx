'use client';

import { useEffect, useState } from 'react';
import { ICombo, ISelectedCombo } from '@/types';

interface ComboSelectorProps {
  selectedCombos: ISelectedCombo[];
  onCombosChange: (combos: ISelectedCombo[]) => void;
  cinemaId?: string;
}

const categoryLabels: Record<string, string> = {
  combo: '🍿 Combo',
  snack: '🥨 Snack',
  drink: '🥤 Nước uống',
};

const categoryColors: Record<string, string> = {
  combo: 'from-orange-500 to-red-500',
  snack: 'from-yellow-500 to-orange-500',
  drink: 'from-cyan-500 to-blue-500',
};

export default function ComboSelector({ selectedCombos, onCombosChange, cinemaId }: ComboSelectorProps) {
  const [combos, setCombos] = useState<ICombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchCombos = async () => {
      try {
        const query = cinemaId ? `?cinemaId=${cinemaId}` : '';
        const res = await fetch(`${API_URL}/combos${query}`);
        const data = await res.json();
        setCombos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Lỗi tải danh sách combo:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCombos();
  }, [API_URL, cinemaId]);

  // Lấy số lượng combo đã chọn
  const getQuantity = (comboId: string): number => {
    const found = selectedCombos.find((sc) => sc.combo._id === comboId);
    return found ? found.quantity : 0;
  };

  // Thêm combo
  const handleAdd = (combo: ICombo) => {
    const existing = selectedCombos.find((sc) => sc.combo._id === combo._id);
    if (existing) {
      if (existing.quantity >= 10) return; // Max 10
      onCombosChange(
        selectedCombos.map((sc) =>
          sc.combo._id === combo._id ? { ...sc, quantity: sc.quantity + 1 } : sc,
        ),
      );
    } else {
      onCombosChange([...selectedCombos, { combo, quantity: 1 }]);
    }
  };

  // Giảm combo
  const handleRemove = (comboId: string) => {
    const existing = selectedCombos.find((sc) => sc.combo._id === comboId);
    if (!existing) return;

    if (existing.quantity <= 1) {
      onCombosChange(selectedCombos.filter((sc) => sc.combo._id !== comboId));
    } else {
      onCombosChange(
        selectedCombos.map((sc) =>
          sc.combo._id === comboId ? { ...sc, quantity: sc.quantity - 1 } : sc,
        ),
      );
    }
  };

  // Tính tổng tiền combo
  const totalComboPrice = selectedCombos.reduce(
    (sum, sc) => sum + sc.combo.price * sc.quantity,
    0,
  );

  // Lấy danh sách categories có dữ liệu
  const categories = ['all', ...new Set(combos.map((c) => c.category))];

  // Filter theo category
  const filteredCombos =
    activeCategory === 'all'
      ? combos
      : combos.filter((c) => c.category === activeCategory);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-400">Đang tải combo bắp nước...</span>
        </div>
      </div>
    );
  }

  if (combos.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-gray-800/50 backdrop-blur rounded-3xl p-8 border border-gray-700/50 max-w-md mx-auto">
          <span className="text-6xl mb-6 block drop-shadow-xl saturate-150">🍿</span>
          <h3 className="text-xl font-bold text-gray-200 mb-2">Chưa Có Menu F&B</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Hệ thống rạp này hiện chưa cập nhật menu bắp nước trực tuyến. Vui lòng bấm <strong className="text-white">Tiếp Tục</strong> để sang bước thanh toán.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-yellow-500 flex items-center justify-center gap-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Thêm Bắp Nước
        </h2>
        <p className="text-gray-500 text-sm mt-1">Chọn combo yêu thích để thưởng thức cùng bộ phim</p>
      </div>

      {/* Category Tabs */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {cat === 'all' ? '🎯 Tất cả' : categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* Combo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCombos.map((combo) => {
          const qty = getQuantity(combo._id);
          const isSelected = qty > 0;

          return (
            <div
              key={combo._id}
              className={`relative bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                isSelected
                  ? 'border-yellow-500 shadow-lg shadow-yellow-500/20 scale-[1.02]'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* Popular Badge */}
              {combo.is_popular && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                    🔥 Bán chạy
                  </span>
                </div>
              )}

              {/* Image */}
              <div className={`relative h-36 bg-gradient-to-br ${categoryColors[combo.category] || 'from-gray-600 to-gray-700'} flex items-center justify-center`}>
                {combo.image_url ? (
                  <img
                    src={combo.image_url.startsWith('/') ? `${API_URL}${combo.image_url}` : combo.image_url}
                    alt={combo.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl">
                    {combo.category === 'combo' ? '🍿' : combo.category === 'drink' ? '🥤' : '🥨'}
                  </span>
                )}

                {/* Category badge */}
                <div className="absolute bottom-2 right-2">
                  <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                    {categoryLabels[combo.category] || combo.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-white text-base mb-1">{combo.name}</h3>
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">{combo.description}</p>

                {/* Price + Controls */}
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 font-bold text-lg">
                    {combo.price.toLocaleString()}đ
                  </span>

                  {isSelected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemove(combo._id)}
                        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-red-600 text-white flex items-center justify-center transition-colors font-bold text-lg"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-bold text-white text-lg">{qty}</span>
                      <button
                        onClick={() => handleAdd(combo)}
                        className="w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 flex items-center justify-center transition-colors font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAdd(combo)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-semibold text-sm transition-all hover:shadow-lg hover:shadow-yellow-500/30"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Thêm
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tổng tiền combo */}
      {selectedCombos.length > 0 && (
        <div className="mt-6 bg-gray-800/80 backdrop-blur border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">Bắp nước đã chọn:</span>
            <button
              onClick={() => onCombosChange([])}
              className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
            >
              Xóa tất cả
            </button>
          </div>
          <div className="space-y-2">
            {selectedCombos.map((sc) => (
              <div key={sc.combo._id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">
                  {sc.combo.name} × {sc.quantity}
                </span>
                <span className="text-yellow-400 font-semibold">
                  {(sc.combo.price * sc.quantity).toLocaleString()}đ
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-700 mt-3 pt-3 flex items-center justify-between">
            <span className="text-white font-medium">Tổng bắp nước:</span>
            <span className="text-yellow-400 font-bold text-lg">
              {totalComboPrice.toLocaleString()}đ
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
