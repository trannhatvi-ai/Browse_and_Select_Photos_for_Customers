# Khi git init: làm sao biết repo sẽ dùng account nào?

Trả lời ngắn:
- git init chỉ tạo local repository.
- Account chỉ được xác định khi bạn set user.email local và set remote URL.

## 1. Tạo repo local

```powershell
mkdir my-project
cd my-project
git init
```

## 2. Chọn account cho repo mới

Account 1:

```powershell
git config user.name "Your Name"
git config user.email "vitrannhat@gmail.com"
git remote add origin git@github-acc1:<username>/my-project.git
```

Account 2:

```powershell
git config user.name "Your Name"
git config user.email "vitrannhat1@gmail.com"
git remote add origin git@github-acc2:<username>/my-project.git
```

## 3. Xác nhận chắc chắn trước push

```powershell
git config user.email
git remote -v
```

## 4. Push lần đầu

```powershell
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

## 5. Mẹo dùng script tự động

Bạn đã có script setup trong workspace:
- setup-repo.ps1

Ví dụ:

```powershell
.\setup-repo.ps1 -ProjectName "my-project" -Account 1 -Username "<username>"
```
