# Yin website

Angular frontend, Spring Boot 3 backend và PostgreSQL 17. Nội dung công khai ban đầu được seed từ prototype Angular; liên hệ và analytics bắt đầu với dữ liệu thật, không dùng dữ liệu demo.

## Chạy bằng Docker

1. Sao chép `.env.example` thành `.env`, đặt `POSTGRES_PASSWORD`, `JWT_SECRET` (ít nhất 32 byte UTF-8) và `ADMIN_PASSWORD` (ít nhất 12 ký tự). Không dùng giá trị mẫu khi triển khai.
2. Chạy `docker-compose -f docker-compose.yml up --build -d`.
3. Mở `http://localhost:4200` và đăng nhập quản trị tại `http://localhost:4200/admin/login` bằng `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

Container PostgreSQL tự tạo database `POSTGRES_DB`; backend tạo các bảng khi khởi động. Lần khởi động đầu, nếu database chưa sẵn sàng, container backend sẽ tự khởi động lại. Nội dung mẫu chỉ được thêm khi bảng bài viết trống hoặc trang tương ứng chưa tồn tại. Tài khoản quản trị mặc định được tạo nếu chưa có `ADMIN` đang hoạt động; đổi biến `ADMIN_PASSWORD` sau đó không tự đổi mật khẩu đã lưu. API giới hạn số lần đăng nhập, đăng ký, gửi hỗ trợ, gửi liên hệ và ghi analytics; backend kiểm tra dữ liệu trước khi ghi. Mặc định cả ba cổng chỉ nghe trên localhost. Khi đưa website ra Internet, đặt reverse proxy HTTPS phía trước và chỉ công khai cổng frontend.
Đặt `APP_SEED_ENABLED=false` để không thêm bài viết/trang mẫu khi khởi tạo một database rỗng. Nếu đã có dữ liệu, việc đổi cờ này không xóa dữ liệu.

PostgreSQL chỉ nghe trên localhost của VPS và mạng Docker; backend dùng pool tối đa 5 kết nối theo mặc định. Không đưa mật khẩu hoặc JWT secret vào source code. Ảnh CMS chỉ nhận PNG/JPEG/GIF tối đa 5 MB và 25 triệu pixel; Docker lưu ảnh vào volume `yin_yin_media` khi project Compose tên `yin`, backend chạy trực tiếp dùng `MEDIA_STORAGE_DIR` (mặc định `./media`). Sao lưu volume ảnh cùng database. Xem [hướng dẫn VPS](docs/deploy-vps.md).

## Phát triển cục bộ

- Backend: cần Java 21, Maven và PostgreSQL. Tải biến từ `.env`, chạy `mvn spring-boot:run` trong `backend`.
- Frontend: `npm install` rồi `npm start` trong `frontend`. Angular proxy `/api` tới `http://localhost:8080`.
- Kiểm tra: `mvn test` trong `backend`; `npm test -- --watch=false` và `npm run build` trong `frontend`.

## API chính

Xem [lộ trình học backend từ code hiện tại](docs/backend-learning-guide.md) và [mẫu kiến trúc, API contract liên hệ](docs/architecture-contact-example.md) để theo dõi luồng Angular Signal → HTTP → Spring Service/port → JPA/Hibernate → PostgreSQL. Chức năng liên hệ dùng JPA; các chức năng còn lại hiện vẫn dùng JDBC.

| Phương thức | Đường dẫn | Quyền |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/client/login`, `/api/auth/admin/login` | Công khai |
| POST | `/api/auth/login` (alias admin cũ) | Công khai |
| GET, PATCH | `/api/client/me`, `/api/client/me/updates` | Client Bearer token |
| GET, POST | `/api/client/support-requests` | Client Bearer token |
| GET | `/api/admin/clients`, `/api/admin/contacts` | ADMIN/MANAGER |
| GET, PATCH | `/api/admin/support-requests[/{id}]` | ADMIN/MANAGER/FIXER |
| GET, POST | `/api/admin/accounts` | ADMIN |
| PATCH | `/api/admin/accounts/{id}/status`, `/api/admin/accounts/{id}/role` | ADMIN |
| POST | `/api/admin/accounts/{id}/reset-password` | ADMIN |
| GET | `/api/pages`, `/api/articles`, `/api/articles/{slug}` | Công khai |
| GET | `/api/articles/categories` | Công khai |
| GET | `/api/pages/{key}` | Công khai |
| GET | `/api/admin/articles[/{id}]`, `/api/admin/reading-sessions` | ADMIN/MANAGER/FIXER |
| POST | `/api/contacts`, `/api/analytics/views`, `/api/analytics/reading-sessions`, `/api/articles/{slug}/view` | Công khai |
| GET | `/api/admin/bootstrap`, `/api/admin/analytics` | ADMIN/MANAGER/FIXER |
| POST | `/api/admin/articles` | ADMIN/MANAGER |
| PUT, DELETE | `/api/admin/articles/{id}` | ADMIN/MANAGER |
| GET | `/api/admin/articles/trash` | ADMIN/MANAGER/FIXER |
| POST | `/api/admin/articles/{id}/restore` | ADMIN/MANAGER |
| POST | `/api/admin/upload` | ADMIN/MANAGER |
| GET | `/api/media/{name}` | Công khai |
| PUT | `/api/admin/pages/{key}`, `/api/admin/contacts/{id}` | ADMIN/MANAGER |

API dùng JWT trong header `Authorization: Bearer …`. `ADMIN` quản lý tài khoản và toàn bộ CMS; `MANAGER` quản lý CMS, khách hàng và hỗ trợ; `FIXER` xem bài viết/CMS, xử lý hỗ trợ và xem analytics. Khóa tài khoản, đổi vai trò và đặt lại mật khẩu tăng `token_version` để vô hiệu hóa token cũ; các request dùng JWT kiểm tra lại trạng thái tài khoản trong database. Frontend quản trị giữ token trong `sessionStorage`, nên đóng tab hoặc đăng xuất sẽ xóa phiên đăng nhập. Giao diện client và các tab quản trị được mô tả tại [hợp đồng frontend](docs/auth-support-frontend-handoff.md). File `docker/mssql/init.sql` là schema thử nghiệm cũ và không được dùng bởi stack hiện tại; schema PostgreSQL nằm trong `backend/src/main/resources/schema.sql`. Dữ liệu SQL Server cũ không tự chuyển sang PostgreSQL.

Bài viết mới mặc định là `DRAFT`. Luồng hợp lệ: `DRAFT` → `PUBLISHED` → `ARCHIVED`; bài đã lưu trữ có thể xuất bản lại. `DELETE` đưa bài vào thùng rác, không xóa dữ liệu; API công khai và danh sách CMS thường không trả bài đã xóa. Khôi phục bài từng xuất bản chuyển về `ARCHIVED` để tránh tự công khai lại. Ngày xuất bản do CMS gửi được kiểm tra, không nhận ngày tương lai. Sau khi nâng cấp, `schema.sql` tự thêm `deleted_at` và `token_version` vào bảng cũ.

Các quyết định nghiệp vụ, thay đổi cấu hình và điểm cần kiểm chứng khi triển khai được ghi trong [báo cáo rà soát backend](docs/backend-review-2026-11-03.md).

Các API danh sách đều giới hạn `size` mặc định 20, tối đa 100. Client, hỗ trợ, tài khoản quản trị và trang CMS dùng `page` (bắt đầu từ 0) và trả `{items,page,size,total}`. Bài viết, liên hệ và phiên đọc dùng `cursor` và trả `{items,size,hasMore,nextCursor}`. `/api/admin/bootstrap` chỉ trả summary. Xem [kế hoạch chuyển đổi FE](docs/frontend-pagination-plan.md) trước khi triển khai contract mới.

## Kiểm tra bảo mật

- Backend giới hạn 5 lần đăng nhập sai cho một tài khoản trong 15 phút và 20 lần đăng nhập từ một IP trong 15 phút. Đăng ký và yêu cầu hỗ trợ có giới hạn riêng. Liên hệ, analytics và lượt xem bài viết cũng có giới hạn theo IP.
- JWT được ký bằng khóa riêng trong `.env`, xác minh chữ ký, issuer và hạn dùng tối đa 60 phút. API quản trị chỉ chấp nhận Bearer token hợp lệ.
- Backend kiểm tra kiểu, độ dài, định dạng và giá trị được phép trước khi ghi. HTML bài viết/CMS được lọc; URL `javascript:` bị từ chối. Nginx giới hạn request body và có Content Security Policy.
- Docker chỉ bind các cổng vào `127.0.0.1` theo mặc định. Cần HTTPS ở reverse proxy trước khi công khai website.
- Giới hạn yêu cầu hiện lưu trong bộ nhớ của một instance backend. Nếu triển khai nhiều instance, chuyển bộ đếm sang kho chung như Redis để giữ hiệu lực trên toàn cụm.

Build image backend chạy JUnit trước khi đóng gói. Test bảo mật nằm trong `backend/src/test/java/vn/yin/backend`.
