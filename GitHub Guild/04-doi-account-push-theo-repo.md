# Đổi nhanh account dùng để commit/push theo từng repo

Mục tiêu:
- Giữ Copilot account 1
- Commit/push linh hoạt account 1 hoặc 2 tùy repo

## 1. Kiểm tra trạng thái hiện tại

```powershell
git config user.name
git config user.email
git remote -v
```

## 2. Chuyển repo sang account 1

```powershell
git config user.name "Your Name"
git config user.email "vitrannhat@gmail.com"
git remote set-url origin git@github-acc1:<username>/<repo>.git
```

## 3. Chuyển repo sang account 2

```powershell
git config user.name "Your Name"
git config user.email "vitrannhat1@gmail.com"
git remote set-url origin git@github-acc2:<username>/<repo>.git
```

## 4. Verify trước khi push

```powershell
git config user.email
git remote -v
```

## 5. Push bằng Source Control của VS Code

Quy trình:
- Mở Source Control
- Stage/Commit
- Push hoặc Sync Changes

Git sẽ dùng account theo remote host và local git config của repo hiện tại.

## 6. Quy tắc an toàn trước mỗi lần publish

Chạy 2 lệnh:

```powershell
git config user.email
git remote -v
```

Nếu email và host đúng ý bạn thì mới push.
