# Kế hoạch FE: chuyển danh sách sang phân trang

Ngày rà soát: 03/11/2026. BE đã đổi contract của các endpoint danh sách; FE cần cập nhật **trước khi triển khai hai phần cùng nhau**. Frontend hiện tại vẫn giả định `/api/pages`, `/api/articles`, `/api/admin/accounts` trả mảng và `/api/admin/bootstrap` chứa mọi danh sách, nên sẽ lỗi hoặc chỉ hiển thị thiếu dữ liệu nếu chạy với BE mới.

## 1. Contract chung

- `size` mặc định 20, hợp lệ từ 1 đến 100. Giá trị sai trả HTTP 400.
- Offset: query `page` bắt đầu từ 0; response `{ items, page, size, total }`. FE tính số trang bằng `Math.ceil(total / size)`.
- Cursor/keyset: query `cursor` rỗng ở lần đầu; response `{ items, size, hasMore, nextCursor }`. `nextCursor` là chuỗi opaque: chỉ chuyển lại nguyên văn, không tự giải mã. Khi `hasMore=false`, `nextCursor=null`.
- Khi đổi `search`, `status` hoặc bộ lọc khác, xóa cursor/lịch sử trang và tải lại trang đầu. Debounce tìm kiếm khoảng 300 ms và hủy request cũ để tránh kết quả trả về sai thứ tự.
- Với cursor, dùng nút **Xem thêm** hoặc **Tiếp/Trước** dựa trên lịch sử cursor đã lưu tại FE; không hiển thị số trang hoặc ô nhảy trang.
- Với offset, dùng số trang và nút trước/sau. Giữ `page`, `size`, bộ lọc trên query string để quay lại danh sách không mất vị trí.

## 2. Danh sách và màn hình cần sửa

| API | Cách phân trang | FE cần làm |
| --- | --- | --- |
| `GET /api/pages?page=0&size=20` | Offset | `LocalDbService.loadPublic()` đọc `items`. Hiện chỉ có 5 page key; khi cần một trang cụ thể, dùng `GET /api/pages/{key}`. CMS có thể dùng số trang. |
| `GET /api/articles?category=&search=&cursor=&size=20` | Cursor qua keyset `(sort_at, id)` | Blog công khai gọi tìm kiếm/lọc danh mục trên server; dùng **Xem thêm**. Đường dẫn chi tiết dùng `GET /api/articles/{slug}`, không tìm trong mảng đã tải. |
| `GET /api/articles/categories?page=0&size=20` | Offset | Tải tùy chọn danh mục cho bộ lọc bằng các trang của endpoint này; không suy ra danh mục từ một trang bài viết. |
| `GET /api/admin/articles?status=&category=&search=&cursor=&size=20` | Cursor qua keyset `(sort_at, id)` | Danh sách bài viết quản trị dùng tìm kiếm/lọc trên server và **Xem thêm**. Màn hình sửa lấy `GET /api/admin/articles/{id}`. Sau tạo/sửa/xóa, tải lại trang đầu hoặc cập nhật cache đúng khóa lọc. |
| `GET /api/admin/contacts?status=&search=&cursor=&size=20` | Cursor qua keyset `(created_at, id)` | Danh sách liên hệ dùng tìm kiếm/lọc trên server. Modal chi tiết dùng bản ghi trong trang hiện tại; sau cập nhật trạng thái, tải lại nếu bản ghi không còn khớp bộ lọc. |
| `GET /api/admin/reading-sessions?cursor=&size=20` | Cursor qua keyset `(created_at, id)` | Tab analytics dùng **Xem thêm** cho bảng phiên đọc. Không lấy phiên đọc từ bootstrap. |
| `GET /api/admin/accounts?page=0&size=20` | Offset | `AdminManagementService.getAdminAccounts()` trả `PaginatedResult<AdminAccount>`; màn hình tài khoản thêm điều khiển số trang. |
| `GET /api/admin/clients?updatesOnly=&search=&page=0&size=20` | Offset, đã có | Giữ phân trang hiện tại. Kiểm tra tìm kiếm áp dụng trên server và reset `page=0` khi đổi bộ lọc. |
| `GET /api/admin/support-requests?status=&page=0&size=20` | Offset, đã có | Giữ phân trang hiện tại; reset trang khi đổi trạng thái. |
| `GET /api/client/support-requests?page=0&size=20` | Offset, đã có | Thay kiểu union mảng/cấu trúc phân trang ở `ClientAuthService` bằng `PaginatedResult<SupportRequest>` và thêm điều khiển trang. |

`GET /api/admin/bootstrap` giờ chỉ trả `{ summary }`. `GET /api/admin/analytics` vẫn trả summary. Summary được BE tính bằng SQL và không phải endpoint danh sách; `exitBlocks` cố định tối đa 5, `dailyViews` cố định 7 ngày.

## 3. Thứ tự triển khai FE

1. Tạo hai kiểu response dùng chung (`OffsetPage<T>`, `CursorPage<T>`) và các hàm API có tham số lọc/phân trang. Cập nhật `LocalDbService.loadPublic()` và `loadAdmin()` trước, vì đây là chỗ đang phụ thuộc trực tiếp vào contract cũ.
2. Tách state danh sách theo màn hình. Không lưu mọi bài viết, liên hệ và phiên đọc trong `LocalDbService`; giữ `items`, `loading`, `error`, `hasMore`/`total`, bộ lọc và cursor riêng cho từng màn hình.
3. Chuyển tìm kiếm blog, bài viết quản trị và liên hệ từ `.filter()` trên mảng cục bộ sang request phân trang tới BE. Giữ từ khóa trong URL và debounce nhập liệu.
4. Thêm nút **Xem thêm** cho các danh sách cursor và số trang cho các danh sách offset. Khóa nút khi đang tải, giữ các item đã tải nếu tải trang tiếp lỗi, và hiển thị trạng thái rỗng tương ứng với bộ lọc.
5. Chuyển màn hình chi tiết bài viết sang endpoint chi tiết. Tải lại trang đầu sau thao tác CRUD làm thay đổi thứ tự hoặc bộ lọc.
6. Kiểm tra responsive, bàn phím, thông báo số kết quả và focus sau khi đổi trang. Với danh sách dài, không tự động tải vô hạn để tránh tăng DOM và lưu lượng không kiểm soát.

## 4. Điều kiện nghiệm thu

- Không còn request danh sách để tải hết dữ liệu; mỗi request tối đa 100 bản ghi.
- Tìm kiếm ở trang đầu vẫn tìm được bản ghi nằm ngoài 20 bản ghi đầu của dữ liệu gốc.
- Lọc mới luôn bắt đầu từ trang đầu; request cũ không ghi đè kết quả mới.
- Có thể đi qua trang cuối, danh sách rỗng và lỗi HTTP 400/500 mà UI không bị kẹt loading.
- Với keyset, thêm bản ghi mới giữa hai lần tải không gây lặp bản ghi đã hiển thị. Với offset, FE chấp nhận khả năng dịch trang khi dữ liệu thay đổi và có nút làm mới.
- Public site, admin dashboard, blog detail, CMS editor và trang tài khoản hoạt động với response BE mới.

## 5. Ghi chú triển khai

- Cursor hiện mang cặp thời gian + ID, đã được BE xác thực cú pháp. FE chỉ coi nó là token; khi bộ lọc đổi, token cũ không còn dùng được về mặt ngữ nghĩa.
- Danh sách keyset không có `total` vì phép đếm trên dữ liệu lớn gây thêm chi phí và UI không hỗ trợ nhảy trang. Nếu cần số tổng, tạo endpoint thống kê riêng theo đúng nhu cầu.
- Schema thêm `articles.sort_at` và `reading_sessions.created_at` cùng index để phục vụ keyset. Bản ghi phiên đọc có trước migration được gán thời gian tạo tại lúc migration, nhưng ID vẫn đảm bảo thứ tự xác định khi trùng thời gian.
- Không triển khai BE mới riêng lẻ trước khi FE hoàn thành các mục 1–2; frontend hiện tại chưa tương thích contract mới.
