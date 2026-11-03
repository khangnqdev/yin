# Rà soát backend — 03/11/2026

## Quy tắc đã chốt

| Vai trò | Quyền |
| --- | --- |
| ADMIN | Quản lý tài khoản quản trị, CMS, khách hàng, liên hệ, hỗ trợ, analytics |
| MANAGER | Quản lý CMS, khách hàng, liên hệ, hỗ trợ, analytics |
| FIXER | Xem danh sách và nội dung bài viết CMS, xử lý hỗ trợ, xem analytics |

Bài viết chuyển từ `DRAFT` sang `PUBLISHED`, rồi `ARCHIVED`; bài lưu trữ có thể xuất bản lại. Xóa bài là xóa mềm. Khôi phục bài đã xuất bản đưa về `ARCHIVED`, cần thao tác xuất bản riêng để công khai lại.

## Đã sửa

- Bỏ rule công khai toàn bộ `/api/**`; các API công khai được liệt kê theo phương thức và đường dẫn. Token được đối chiếu lại với trạng thái, vai trò và `token_version` trong database trên mỗi request.
- Quản trị viên `ADMIN` có thể tạo, khóa/mở khóa, đổi vai trò, đặt lại mật khẩu tài khoản quản trị. Các thao tác thay đổi tài khoản vô hiệu hóa token cũ. Câu lệnh SQL chặn khóa hoặc hạ quyền `ADMIN` đang hoạt động cuối cùng.
- Bài viết có `deleted_at`, danh sách thùng rác và API khôi phục. Bài đã xóa, lưu trữ và bản nháp không xuất hiện qua API công khai; lượt xem chỉ tăng khi bài đang xuất bản. Ngày xuất bản và tác giả do CMS gửi được lưu đúng.
- Endpoint tải ảnh nhận PNG/JPEG/GIF thật, tối đa 5 MB và 25 triệu pixel; lưu vào `MEDIA_STORAGE_DIR`, trả URL `/api/media/...`. Bỏ fallback data URL phía frontend; CMS không nhận thêm ảnh base64 trong URL. HTML bài viết giữ URL ảnh nội bộ sau lọc.
- Thông số mã hóa SQL Server, xác minh chứng chỉ và kích thước pool được đưa vào settings có mặc định tương thích. Xóa code ghi `login_attempts` vì bảng này không tồn tại và không có chỗ gọi.
- Frontend hiển thị trạng thái tài khoản thật, có thao tác vòng đời tài khoản, phân quyền điều hướng, thùng rác bài viết và lựa chọn trạng thái khi biên tập. Bản nháp tạo tài khoản trong `localStorage` không còn lưu mật khẩu.

## Điểm còn cần kiểm chứng khi triển khai

- `schema.sql` đang chạy ở mọi lần khởi động. Hai cột mới có migration lặp lại an toàn theo `COL_LENGTH`, nhưng cần chạy thử với bản sao database thực tế và sao lưu trước khi nâng cấp. Bộ test hiện dùng mock, chưa chạy với SQL Server thật.
- Seed nội dung mẫu vẫn bật theo mặc định để giữ hành vi cũ. Đặt `APP_SEED_ENABLED=false` trước khi tạo database production rỗng nếu không muốn nội dung mẫu.
- `FRONTEND_ENV` và các biến `COMPANY_*` trong `.env.example` hiện không được app/Compose đọc. Các cài đặt AI và footer ở frontend nằm trong browser storage, chưa phải settings tập trung của backend. Không nên hiểu các biến này là cấu hình có hiệu lực toàn hệ thống.
- Giới hạn request hiện lưu trong bộ nhớ từng instance; triển khai nhiều backend cần kho đếm chung. Ảnh CMS nằm trong volume `yin_media`, cần sao lưu cùng database.
