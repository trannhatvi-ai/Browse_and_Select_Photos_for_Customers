# Redis database
sudo systemctl start redis-server
sudo systemctl status redis-server
## Xem log trực tiếp (Real-time):
redis-cli monitor
## Theo dõi thống kê hệ thống (Stats):
redis-cli --stat
## Kiểm tra thông tin chi tiết:
redis-cli info
## Xóa toàn bộ dữ liệu trong Redis:
redis-cli flushall

# frontend
cd ./frontend
npm run dev
# backend
cd ./backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000