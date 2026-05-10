# Git Cheat Sheet 1 Trang

Tài liệu này là bản tóm tắt nhanh nhất để dùng mỗi ngày.

## A. Kiểm tra trước khi làm

```powershell
git status
git branch
git config user.email
git remote -v
```

## B. Quy trình commit và push cơ bản

```powershell
git add .
git commit -m "feat: mô tả thay đổi"
git pull --rebase
git push
```

## C. Tạo repo mới và chọn account

### Account 1

```powershell
git init
git config user.name "Your Name"
git config user.email "vitrannhat@gmail.com"
git remote add origin git@github-acc1:<username>/<repo>.git
```

### Account 2

```powershell
git init
git config user.name "Your Name"
git config user.email "vitrannhat1@gmail.com"
git remote add origin git@github-acc2:<username>/<repo>.git
```

## D. Đổi nhanh account push theo repo

```powershell
# đổi sang account 1
git config user.email "vitrannhat@gmail.com"
git remote set-url origin git@github-acc1:<username>/<repo>.git

# đổi sang account 2
git config user.email "vitrannhat1@gmail.com"
git remote set-url origin git@github-acc2:<username>/<repo>.git
```

## E. Kiểm tra trước khi publish bằng Source Control

```powershell
git config user.email
git remote -v
git status
```

Nếu email + host remote đúng thì mới push.

## F. Lệnh xử lý nhanh khi có vấn đề

```powershell
# bỏ stage file
git restore --staged <file>

# hủy thay đổi chưa stage
git restore <file>

# xem lịch sử gọn
git log --oneline --graph --decorate --all

# lưu tạm đang làm
git stash
git stash pop
```

## G. 3 quy tắc an toàn

1. Luôn kiểm tra user.email và remote -v trước khi push.
2. Mỗi repo dùng local config riêng, không phụ thuộc global.
3. Copilot dùng account 1, push dùng account theo remote của repo.
