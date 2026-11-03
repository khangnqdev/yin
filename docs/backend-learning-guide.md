# Học Spring Boot từ backend đang chạy

Tài liệu này dùng chính code trong repo làm bài học. Bắt đầu từ chức năng liên hệ vì luồng ngắn, sau đó mới đọc đăng nhập, hỗ trợ và bài viết. Không cần hiểu mọi annotation trong một lần đọc.

## 1. Bức tranh chung

```text
Angular form → POST /api/contacts → ContactController → ContactService
                                           ↓                 ↓
                                        DTO + @Valid     ContactStore (interface)
                                                            ↓
                                                   ContactJpaAdapter → SQL Server
```

- **Controller** nhận HTTP, đọc JSON, trả mã HTTP. `@RestController` biến giá trị trả về thành JSON; `@PostMapping` gắn phương thức và đường dẫn.
- **DTO** (`CreateContactRequest`) mô tả dữ liệu HTTP và các ràng buộc cơ bản như `@NotBlank`, `@Size`, `@Email`. `@Valid` kích hoạt kiểm tra trước khi vào phương thức controller.
- **Service** quyết định quy tắc nghiệp vụ: trường nào được xuống dòng, số điện thoại hợp lệ, mỗi IP được gửi bao nhiêu lần. `@Service` cho Spring tạo object và tiêm vào controller qua constructor.
- **Port** (`ContactStore`) nói service cần thao tác gì với dữ liệu, không buộc service biết JPA.
- **Adapter/Repository** thực hiện thao tác đó bằng JPA. `ContactEntity` ánh xạ cột SQL; `Contact` là dữ liệu domain trả về sau khi đọc.
- **ApiErrors** chuyển exception thành `{ "message": "..." }` và mã HTTP phù hợp.

Các phần tài khoản, hỗ trợ, bài viết và analytics hiện dùng `JdbcTemplate` cùng `Map<String, Object>`. Đó là cách triển khai khác trong cùng dự án, chưa theo mô hình port/JPA của Contact. Đọc luồng Contact trước rồi so sánh sẽ dễ thấy trách nhiệm từng lớp.

## 2. Tự lần theo một yêu cầu tạo liên hệ

1. Mở `frontend/src/app/features/public/contact/contact.component.ts`, tìm `submitContactForm()`. Component kiểm tra nhanh để báo lỗi ngay trên giao diện và gọi Angular `ContactService.create()`.
2. Mở `frontend/src/app/core/services/contact.service.ts`, tìm `http.post('/api/contacts', dto)`. Đây là chỗ gửi JSON qua mạng.
3. Mở `backend/src/main/java/vn/yin/backend/controller/ContactController.java`, tìm `@PostMapping("/contacts")`. `@Valid` kiểm tra DTO. Controller đổi DTO thành command và gọi service.
4. Mở `ContactService.create()`. Đọc từng `if`: dữ liệu sai thì ném `ContactException`; đúng thì gọi `store.create()`. Đây là ví dụ **guard clause**: chặn sớm tình huống sai, giữ luồng thành công thẳng và dễ đọc.
5. Mở `ContactJpaAdapter.create()` rồi `ContactEntity`. Adapter tạo entity và gọi `repository.save()`. Hibernate tạo lệnh ghi vào bảng `contacts`.
6. Quay lại controller: khi thành công trả `201 Created` với `{ "id": "..." }`. Khi lỗi, `ApiErrors` trả `400`, `429` hoặc mã tương ứng.

Frontend kiểm tra để người dùng nhận phản hồi nhanh, còn backend phải tự kiểm tra vì client bất kỳ cũng có thể gọi API mà không dùng form Angular.

## 3. Tình huống cần tự dự đoán trước khi đọc code

| Tình huống | Nơi xử lý | Kết quả |
| --- | --- | --- |
| Thiếu `fullName` hoặc email sai | `@Valid` trên DTO | `400`, chưa gọi service |
| Tên có ký tự xuống dòng | `ContactService.create()` | `400`, chưa ghi DB |
| Nội dung `message` có xuống dòng | `ContactService.create()` | Hợp lệ nếu các điều kiện khác đúng |
| Số điện thoại chứa chữ hoặc ít hơn 7 chữ số | `ContactService.create()` | `400` |
| IP gửi liên hệ lần thứ tư trong một phút | `AbuseProtection` và `ContactService` | `429`, `Retry-After: 60` |
| Người không có token admin đọc danh sách | `SecurityConfig` | Bị chặn trước controller |
| Admin cập nhật `status` ngoài bốn giá trị | `ContactService.update()` | `400` |
| Admin cập nhật ID không tồn tại | `ContactJpaAdapter` → `ContactService` | `404` |

Lưu ý: giới hạn tần suất hiện nằm trong bộ nhớ của một backend instance và được tính trước khi lưu DB. `@Transactional` quản lý transaction của thao tác lưu trữ, không hoàn tác bộ đếm trong bộ nhớ.

## 4. Các khái niệm nên nắm theo thứ tự

1. **Java cơ bản:** `record`, class, constructor, interface, `List`/`Map`, `null`, `Optional`, exception, `if` và `return`.
2. **HTTP:** `GET` để đọc, `POST` để tạo, `PUT`/`PATCH` để cập nhật; JSON request/response; `201`, `400`, `401`, `403`, `404`, `429`.
3. **Spring Web:** `@RestController`, mapping, `@RequestBody`, `@PathVariable`, `@RequestParam`, `@Valid`, `ResponseEntity`, `@RestControllerAdvice`.
4. **Tiêm phụ thuộc:** Spring tạo `ContactService` và `ContactJpaAdapter`, rồi nối chúng qua constructor/interface. Đừng tự `new` service trong controller đang chạy.
5. **Lưu trữ:** phân biệt SQL trong `JdbcTemplate` với `JpaRepository.save/findById`; đọc `schema.sql` để biết cột thực tế. `ddl-auto: none` nghĩa là JPA không tự thay bảng.
6. **Security:** `SecurityConfig` yêu cầu JWT có scope `ADMIN` cho `/api/admin/**`, scope `CLIENT` cho `/api/client/**`. Login phát token; request sau gửi `Authorization: Bearer ...`.
7. **Test:** `ContactServiceTest` dùng mock `ContactStore` để kiểm tra quy tắc nghiệp vụ mà không cần SQL Server. Viết test cho một tình huống sai và một tình huống đúng trước khi sửa logic.

## 5. Bài tập thực hành nhỏ

- Dự đoán: nếu `companyName` chứa xuống dòng thì API trả gì? Tìm `validateText(false, ...)` và test tương ứng.
- Thêm một test cho `status` không hợp lệ khi cập nhật liên hệ; kiểm tra `store.update()` không bị gọi.
- Theo dõi `GET /api/admin/contacts?size=20`: service lấy `size + 1` dòng để biết còn trang sau hay không, rồi `Pagination.slice()` chỉ trả 20 dòng. Giải thích vai trò của `nextCursor`.
- So sánh `ContactService` và `SupportService`: xác định validation, business rule, database call nằm ở đâu. Đề xuất DTO cho một request hỗ trợ, nhưng giữ nguyên API contract trước khi đổi code.

## 6. Chỗ nên cải tiến tiếp khi đã quen

Ưu tiên chuyển từng endpoint còn nhận `Map<String, Object>` sang DTO có kiểu dữ liệu rõ ràng và validation; bắt đầu từ một endpoint đơn giản như cập nhật lựa chọn nhận tin. Sau đó đồng bộ cách phân trang và viết migration có kiểm soát cho thay đổi schema. Mỗi lần chỉ sửa một luồng, cập nhật contract và test cho các tình huống biên liên quan.

Lệnh kiểm tra khi máy đã có Java 21 và Maven: chạy `mvn test` trong `backend`. Chạy ứng dụng cần thêm SQL Server và biến môi trường được mô tả trong `README.md`.
