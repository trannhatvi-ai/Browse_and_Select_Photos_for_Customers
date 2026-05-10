# Cố định GitHub Copilot dùng account 1 trong VS Code

Mục tiêu:
- Copilot luôn dùng account: vitrannhat@gmail.com

## 1. Kiểm tra account đang đăng nhập VS Code

Trong VS Code:
- Bấm Accounts (góc dưới bên trái)
- Xem GitHub account hiện tại

## 2. Đăng xuất account sai (nếu có)

Trong menu Accounts:
- Sign out khỏi GitHub hiện tại

## 3. Đăng nhập lại đúng account

Trong VS Code:
- Sign in with GitHub
- Chọn vitrannhat@gmail.com
- Xác nhận quyền truy cập

## 4. Xác nhận Copilot

Kiểm tra nhanh:
- Mở Copilot Chat
- Nếu không có lỗi license/access và hoạt động bình thường là đã đúng account

## 5. Lưu ý quan trọng

- Account dùng cho Copilot trong VS Code tách biệt với account dùng để push code ở từng repo.
- Bạn có thể giữ Copilot ở account 1, nhưng push repo bất kỳ bằng account 1 hoặc 2 qua remote SSH và git config local.
