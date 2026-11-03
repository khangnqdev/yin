# Bàn giao frontend: tài khoản client, đăng nhập quản trị, cập nhật và hỗ trợ

Tài liệu này là hợp đồng cho AI triển khai **frontend**. Backend cung cấp các API dưới đây; frontend hiện tại chưa được sửa trong hạng mục này. API dùng JSON UTF-8, đường dẫn gốc `/api`, ngày sinh theo `YYYY-MM-DD`, thời gian theo ISO 8601 UTC. Các API cần xác thực nhận header `Authorization: Bearer <token>`.

## Màn hình và input

| Màn hình gợi ý | Input / nội dung | Hành động |
| --- | --- | --- |
| `/register` (client) | Email, username, password, số điện thoại, ngày sinh; checkbox **Nhận thông tin cập nhật** (mặc định bỏ chọn) | Gửi `POST /api/auth/register`; hiển thị lỗi theo trường, chuyển sang đăng nhập khi thành công. Không có chọn vai trò. |
| `/login` (client) | Username, password | Gửi `POST /api/auth/client/login`; lưu token của client và vào trang tài khoản. |
| `/account` (client) | Thông tin tài khoản, trạng thái nhận cập nhật; checkbox đổi trạng thái | `GET /api/client/me`, `PATCH /api/client/me/updates`. |
| `/account/support` (client) | Chủ đề, nội dung yêu cầu; danh sách yêu cầu và trạng thái | `POST /api/client/support-requests`, `GET /api/client/support-requests`. |
| `/admin/login` (quản trị) | Username, password | Gửi `POST /api/auth/admin/login`; không đặt link tới trang này trên UI client. Vai trò được lấy từ tài khoản, **không có dropdown chọn vai trò**. |
| Tab `/admin/clients` | Danh sách client đã bật nhận cập nhật: username, email, số điện thoại, ngày sinh, ngày đăng ký; tìm kiếm, phân trang | `GET /api/admin/clients?updatesOnly=true&search=&page=0&size=20`. |
| Tab `/admin/support-requests` | Danh sách yêu cầu: client, email, số điện thoại, chủ đề, nội dung, trạng thái, thời gian; bộ lọc trạng thái, phân trang | `GET /api/admin/support-requests`; đổi trạng thái bằng `PATCH /api/admin/support-requests/{id}`. |
| Quản lý tài khoản quản trị (có thể làm sau) | Username, password, vai trò `MANAGER`/`ADMIN`/`FIXER` | `GET /api/admin/accounts`, `POST /api/admin/accounts`. |

Frontend cần chặn route quản trị đối với token client, và route client đối với token quản trị. Khi API trả 401, xóa token tương ứng và đưa về trang đăng nhập đúng loại. Khi trả 403, hiển thị không có quyền. Chỉ hiển thị trang `/admin/login` khi người dùng truy cập đúng URL; **URL khó đoán không phải cơ chế bảo mật**, backend vẫn xác minh vai trò của token. Hiện tại cả `MANAGER`, `ADMIN`, `FIXER` đều dùng được các API `/api/admin/**`; phân quyền chi tiết sẽ làm sau.

## Hợp đồng API

### Đăng ký client

`POST /api/auth/register` (không cần token)

```json
{"email":"client@example.com","username":"client_01","password":"a-long-private-password","phone":"+84 901 234 567","dateOfBirth":"1998-05-20","receiveUpdates":true}
```

`email`: tối đa 255 ký tự, định dạng email; `username`: 3–50 ký tự ASCII gồm chữ, số, `_`, `.`, `-`; `password`: tối thiểu 12 ký tự và tối đa 72 byte UTF-8, không được gửi khoảng trắng đầu/cuối; `phone`: 7–15 chữ số, được phép dấu `+`, khoảng trắng, `()`, `.` và `-`; `dateOfBirth`: ngày có thật từ 1900-01-01 đến hiện tại; `receiveUpdates`: boolean, mặc định `false` nếu không gửi. Email và username là duy nhất, so khớp không phân biệt chữ hoa/thường. Backend luôn tạo vai trò `CLIENT`, lưu mật khẩu dạng bcrypt, không trả mật khẩu.

Thành công `201`:

```json
{"id":"uuid","username":"client_01","email":"client@example.com","phone":"+84 901 234 567","dateOfBirth":"1998-05-20","receiveUpdates":true,"role":"CLIENT","createdAt":"2026-11-02T00:00:00Z"}
```

### Đăng nhập

`POST /api/auth/client/login` hoặc `POST /api/auth/admin/login` (không cần token):

```json
{"username":"client_01","password":"a-long-private-password"}
```

Thành công `200`:

```json
{"token":"jwt","tokenType":"Bearer","expiresIn":3600,"user":{"id":"uuid","username":"client_01","role":"CLIENT"}}
```

API admin trả `role` là `MANAGER`, `ADMIN` hoặc `FIXER`. Không gửi vai trò trong body đăng nhập. Endpoint cũ `POST /api/auth/login` tiếp tục là alias cho admin để frontend quản trị hiện tại còn chạy; frontend mới nên dùng `/api/auth/admin/login`.

### Hồ sơ và nhận cập nhật

`GET /api/client/me` trả hồ sơ giống response đăng ký. `PATCH /api/client/me/updates` nhận `{"receiveUpdates":false}` và trả hồ sơ mới. Trạng thái checkbox được lưu trong cơ sở dữ liệu; tab quản trị chỉ lấy client đang bật.

### Yêu cầu hỗ trợ

`POST /api/client/support-requests` nhận `{"subject":"Cần tư vấn","message":"Mô tả vấn đề..."}`. `subject` dài 3–200 ký tự; `message` dài 10–5000 ký tự. Thành công `201` trả `{"id":"uuid","subject":"Cần tư vấn","message":"Mô tả vấn đề...","status":"OPEN","createdAt":"...","updatedAt":"..."}`. `GET /api/client/support-requests?page=0&size=20` chỉ trả yêu cầu thuộc client đang đăng nhập, dạng `{"items":[<yêu cầu>],"page":0,"size":20,"total":1}`.

`GET /api/admin/support-requests?status=OPEN&page=0&size=20` trả `{"items":[{"id":"uuid","clientId":"uuid","username":"client_01","email":"client@example.com","phone":"+84 901 234 567","subject":"Cần tư vấn","message":"Mô tả vấn đề...","status":"OPEN","createdAt":"...","updatedAt":"..."}],"page":0,"size":20,"total":1}`. Bỏ `status` để lấy tất cả. Trạng thái hợp lệ: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`. `PATCH /api/admin/support-requests/{id}` nhận `{"status":"IN_PROGRESS"}` và trả bản ghi cập nhật.

### Danh sách client và tài khoản quản trị

`GET /api/admin/clients?updatesOnly=true&search=&page=0&size=20` trả `{"items":[<hồ sơ client>],"page":0,"size":20,"total":1}`. `search` tìm theo username/email/số điện thoại; bỏ `updatesOnly` để xem mọi client.

`GET /api/admin/accounts` trả danh sách `[{"id":"uuid","username":"admin1","role":"ADMIN","isActive":true,"createdAt":"..."}]`. `POST /api/admin/accounts` nhận `{"username":"fixer1","password":"a-long-private-password","role":"FIXER"}`, thành công `201` trả thông tin tài khoản không có mật khẩu. Không có endpoint tự đăng ký quản trị công khai.

## Lỗi, trạng thái và an toàn UI

Lỗi do validation và nghiệp vụ có dạng `{"message":"..."}`; lỗi 401/403 từ lớp bảo mật có thể không có body, nên frontend luôn xử lý theo HTTP status. `400`: input không hợp lệ; `401`: sai thông tin đăng nhập hoặc token thiếu/hết hạn; `403`: token sai cổng; `404`: bản ghi không tồn tại; `409`: username/email trùng; `429`: quá nhiều lần thử, đọc header `Retry-After` (giây). Không phân biệt “username không tồn tại” và “mật khẩu sai” trong UI đăng nhập. Tắt submit khi request đang chạy, không ghi password/token vào log, không dựng HTML từ `subject`/`message` hay dữ liệu tài khoản. Dùng text binding của Angular. Với API chỉ dùng Bearer token và không dùng cookie, frontend tự quản lý token; ưu tiên giữ trong bộ nhớ ứng dụng và yêu cầu đăng nhập lại sau reload nếu chưa có cơ chế lưu an toàn.
