# AI Prompt Template cho dự án Cinema Booking

## Tổng quan dự án

Dự án là hệ thống đặt vé xem phim gồm:

- Frontend: `frontend/client`, Next.js App Router, React, TypeScript, Tailwind CSS.
- Backend: `backend/server`, NestJS, MongoDB/Mongoose, JWT authentication.
- Database: MongoDB, schema được định nghĩa bằng Mongoose trong từng module backend.
- Chức năng chính: xem phim/rạp/suất chiếu, đặt ghế, thanh toán MoMo, quản lý admin, combo bắp nước, review phim, profile và vé của người dùng.

## Cấu trúc thư mục

- `frontend/client/src/app/(user)`: các trang người dùng.
- `frontend/client/src/app/(admin)`: layout và trang quản trị.
- `frontend/client/src/components`: component dùng lại.
- `frontend/client/src/context/AuthContext.tsx`: trạng thái đăng nhập phía client.
- `frontend/client/src/lib/api.ts`: helper API/token phía frontend.
- `frontend/client/src/types`: type dùng chung ở frontend.
- `backend/server/src/auth`: đăng ký, đăng nhập, JWT strategy.
- `backend/server/src/users`: profile, avatar, password.
- `backend/server/src/movies`, `cinemas`, `cinema-systems`, `rooms`, `showtimes`: dữ liệu rạp/phim/suất chiếu.
- `backend/server/src/bookings`: đặt vé và danh sách vé.
- `backend/server/src/payments`: thanh toán MoMo, retry/cancel, callback.
- `backend/server/src/combos`: combo bắp nước.
- `backend/server/src/reviews`: review, like, kiểm tra điều kiện review.
- `backend/server/src/common`: DTO, guard, decorator, pipe dùng chung.

## Quy tắc coding

- Đọc cấu trúc và code hiện có trước khi sửa.
- Giữ style hiện tại, tránh refactor rộng nếu không cần.
- Không đổi API contract public nếu không có lý do rõ ràng.
- Không trả password hoặc secret ra response/log.
- Với request có dữ liệu từ client, ưu tiên DTO + `class-validator`.
- Với MongoDB id, validate ObjectId trước khi gọi `findById`.
- Nếu sửa logic có rủi ro race condition, dùng atomic update hoặc transaction.

## Quy tắc frontend

- Dùng `NEXT_PUBLIC_API_URL` qua helper `frontend/client/src/lib/api.ts` khi có thể.
- Request admin hoặc request cần đăng nhập phải gửi `Authorization: Bearer <token>`.
- Frontend chỉ dùng role trong localStorage để điều hướng UX; backend mới là nơi quyết định quyền.
- Không phá layout/style Tailwind hiện có nếu chỉ sửa logic.
- Sau khi sửa trang admin/user, chạy `npm run build` trong `frontend/client`.

## Quy tắc backend

- Endpoint public chỉ dành cho dữ liệu người dùng được phép xem.
- Endpoint tạo/sửa/xóa/admin list/debug phải dùng JWT và role `admin`.
- Endpoint của user phải dùng JWT và kiểm tra ownership khi truy cập dữ liệu riêng.
- Dùng `AdminOnly` cho route admin.
- Dùng `ValidationPipe` global với whitelist/transform.
- Khi thêm service logic, trả lỗi NestJS rõ ràng: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`.

## Quy tắc database

- Schema nằm trong `backend/server/src/**/schemas` hoặc `user.schema.ts`.
- Không tự ý đổi field đang dùng bởi frontend.
- Nếu thêm index/schema field, giải thích impact và việc có cần migration hay không.
- Với đặt ghế, luôn lock ghế bằng atomic update trên `booked_seats`; không dùng check-then-push tách rời.
- Khi booking/payment thất bại sau khi giữ ghế, phải release ghế.

## Quy tắc authentication/authorization

- JWT payload có `sub`, `email`, `role`, `full_name`.
- Admin API cần `AuthGuard('jwt')` + `RolesGuard` qua `AdminOnly`.
- User API cần `AuthGuard('jwt')`.
- Dữ liệu riêng như booking/payment status phải kiểm tra user là chủ sở hữu hoặc admin.
- Không tin role từ frontend để cấp quyền.

## Quy trình kiểm tra lỗi trước khi sửa

1. Chạy `git status --short` để biết worktree.
2. Đọc manifest/config: `package.json`, `tsconfig`, `.env.example`, Next/Nest config.
3. Dò controller/service/schema liên quan bằng `rg`.
4. Xác định API public, API user-auth, API admin.
5. Kiểm tra luồng frontend gọi backend và dữ liệu MongoDB liên quan.
6. Liệt kê lỗi/rủi ro cụ thể trước khi sửa.
7. Sửa tối thiểu theo phạm vi yêu cầu.
8. Chạy build/test phù hợp.
9. Báo cáo file đã sửa, lỗi đã phát hiện, test đã chạy, phần chưa kiểm chứng thủ công nếu có.

## Template prompt chuẩn

```text
Hãy làm việc trên dự án Cinema Booking trong repo hiện tại.

Mục tiêu:
- [Mô tả chức năng/lỗi cần xử lý]

Yêu cầu:
- Đọc code liên quan trước khi sửa.
- Giữ nguyên style hiện tại.
- Không thay đổi API/schema nếu không cần; nếu có phải giải thích rõ.
- Với backend, kiểm tra auth/authorization, DTO validation, ObjectId, ownership và lỗi MongoDB.
- Với frontend, kiểm tra request API, token, loading/error state và UI không bị vỡ.
- Sau khi sửa, chạy build/test phù hợp:
  - backend/server: npm run build
  - frontend/client: npm run build

Kết quả mong muốn:
- Sửa trực tiếp code.
- Nêu ngắn gọn lỗi tìm thấy.
- Nêu file/luồng đã chỉnh.
- Nêu lệnh kiểm thử đã chạy và kết quả.
```
