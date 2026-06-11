'use client';

import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { API_URL, authHeaders } from '@/lib/api';
import { toastError } from '@/utils/toast';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Viết nội dung bài viết...',
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isInitiatedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isInitiatedRef.current) return;

    isInitiatedRef.current = true;

    // Khởi tạo editor
    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder,
      bounds: containerRef.current, // Giới hạn tooltip hiển thị trong editor
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image', 'video'],
            ['clean'],
          ],
        },
      },
    });

    quillRef.current = quill;

    // Thiết lập giá trị ban đầu nếu có
    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    // Lắng nghe sự kiện text-change
    quill.on('text-change', () => {
      const html = quill.root.innerHTML;
      const text = quill.getText().trim();
      // Nếu editor trống, gửi chuỗi rỗng
      if (text === '' && quill.root.innerHTML === '<p><br></p>') {
        onChange('');
      } else {
        onChange(html);
      }
    });

    // Cấu hình Custom Image Handler
    const toolbar = quill.getModule('toolbar') as unknown as {
      addHandler: (name: string, handler: () => void) => void;
    } | null;
    if (toolbar) {
      toolbar.addHandler('image', () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;

          const formData = new FormData();
          formData.append('image', file);

          try {
            const res = await fetch(`${API_URL}/news/upload`, {
              method: 'POST',
              headers: authHeaders(),
              body: formData,
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              toastError(errData.message || 'Upload ảnh thất bại');
              return;
            }

            const data = await res.json();
            if (data.thumbnail) {
              const range = quill.getSelection(true);
              // Chèn ảnh dạng đường dẫn tương đối để dễ quản lý trong DB
              quill.insertEmbed(range.index, 'image', data.thumbnail);
              // Đưa con trỏ ra sau ảnh vừa chèn
              quill.setSelection(range.index + 1);
            } else {
              toastError('Upload ảnh thất bại');
            }
          } catch (error) {
            console.error('Lỗi khi tải ảnh lên editor:', error);
            toastError('Upload ảnh thất bại');
          }
        };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder, onChange]);

  // Cập nhật giá trị bên ngoài vào editor (ví dụ khi reset form hoặc load bài viết)
  useEffect(() => {
    if (quillRef.current) {
      const currentHTML = quillRef.current.root.innerHTML;
      if (value !== currentHTML && !(value === '' && currentHTML === '<p><br></p>')) {
        const range = quillRef.current.getSelection();
        quillRef.current.root.innerHTML = value || '';
        if (range) {
          quillRef.current.setSelection(range);
        }
      }
    }
  }, [value]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white RichTextEditorContainer">
      <div ref={containerRef} className="min-h-[350px] text-gray-900" />
    </div>
  );
}
