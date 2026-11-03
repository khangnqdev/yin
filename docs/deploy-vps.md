# Triển khai Yin trên VPS 103.149.170.233

## Kiến trúc

ZoneDNS trỏ `yin.vn` và `www.yin.vn` đến IP VPS. Nginx cài trên hệ điều hành xử lý HTTP/HTTPS và chuyển mọi request đến cổng `127.0.0.1:4200` của frontend Docker. Frontend chuyển `/api/` đến backend; backend dùng PostgreSQL qua mạng Docker. Docker không mở database hay backend ra Internet.

Tên miền gắn với Nginx của VPS, không gắn với một container. Khi chuyển sang dịch vụ Docker khác, bind dịch vụ đó vào một cổng localhost riêng và đổi `proxy_pass` trong `/etc/nginx/sites-available/yin.vn`, hoặc tạo subdomain và server block riêng. Sau mỗi thay đổi, chạy `nginx -t && systemctl reload nginx`. DNS giữ nguyên nếu IP VPS không đổi.

## DNS trên ZoneDNS

| Loại | Tên | Giá trị |
| --- | --- | --- |
| A | `@` | `103.149.170.233` |
| CNAME | `www` | `yin.vn` |

Đặt TTL 300 giây nếu giao diện cho phép. Kiểm tra `yin.vn` và `www.yin.vn` đều phân giải về `103.149.170.233` trước khi xin chứng chỉ HTTPS. Nếu có bản ghi AAAA cho hai tên này, chỉ giữ khi VPS có IPv6 hoạt động và Nginx lắng nghe trên đó.

## Cài và chạy

VPS Debian 12 cần Docker Compose, Git, Nginx và Certbot. Tài nguyên hiện có 1 vCPU, 1,5 GB RAM và 25 GB SSD. Stack dùng PostgreSQL 17 thay SQL Server để phù hợp RAM; backend và database đã có giới hạn bộ nhớ. Tránh chạy lại hai bot song song với stack này trên cùng VPS.

```sh
git clone https://github.com/khangnqdev/yin.git /opt/yin
cd /opt/yin
cp .env.example .env
chmod 600 .env
# Thay POSTGRES_PASSWORD, JWT_SECRET, ADMIN_PASSWORD bằng giá trị riêng đủ mạnh.
# Giữ FRONTEND_BIND_ADDRESS=127.0.0.1.
docker compose -f docker-compose.yml build yin-backend-api
docker compose -f docker-compose.yml build yin-frontend-web
docker compose -f docker-compose.yml up -d --no-build
docker compose -f docker-compose.yml ps
curl -fsS http://127.0.0.1:4200/
curl -fsS http://127.0.0.1:8080/actuator/health
```

Build lần lượt từng image để tránh dồn RAM trên 1 vCPU/1,5 GB. Lần build đầu có thể chậm. Nếu backend khởi động trước database, Docker sẽ khởi động lại backend cho tới khi database sẵn sàng. Không commit `.env`.

```sh
cp /opt/yin/deploy/nginx-yin.conf /etc/nginx/sites-available/yin.vn
ln -s /etc/nginx/sites-available/yin.vn /etc/nginx/sites-enabled/yin.vn
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Sau khi DNS đã trỏ đúng và cổng 80/443 được phép qua firewall của nhà cung cấp, cấp HTTPS:

```sh
certbot --nginx -d yin.vn -d www.yin.vn --redirect
certbot renew --dry-run
```

Certbot sẽ hỏi email nhận thông báo chứng chỉ. Debian bật `certbot.timer` để tự gia hạn. Kiểm tra `https://yin.vn/`, `https://yin.vn/api/pages` và đăng nhập quản trị sau triển khai.

## Cập nhật và sao lưu

```sh
cd /opt/yin
git pull --ff-only
docker compose -f docker-compose.yml build yin-backend-api
docker compose -f docker-compose.yml build yin-frontend-web
docker compose -f docker-compose.yml up -d --no-build
```

Sao lưu database bằng `pg_dump` và volume `yin_media` theo lịch, giữ bản sao ngoài VPS. Database và ảnh là dữ liệu sống; Git chỉ chứa mã nguồn.

```sh
mkdir -p /root/yin-backups
docker exec yin-postgres-db pg_dump -U yin -d yin_db -Fc > /root/yin-backups/yin.dump
docker run --rm -v yin_yin_media:/data:ro -v /root/yin-backups:/backup alpine:3.20 \
  tar -czf /backup/yin-media.tar.gz -C /data .
```

Bản sao bot game ngày 03/11/2026 nằm ở máy local trong `.local/backups/yin-bot-backup-20261103` (không thuộc Git). Sao chép nguyên thư mục đó lên VPS rồi chạy `bash restore.sh` để khôi phục bot chính. Thư mục chứa mật khẩu và cấu hình riêng, phải giữ kín.
