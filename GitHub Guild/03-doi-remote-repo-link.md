# Đổi link repo (remote origin) trong IDE/Terminal

Áp dụng khi:
- Muốn đổi repo đích để push
- Muốn chuyển giữa account 1 và account 2 bằng host SSH

## 1. Xem remote hiện tại

```powershell
git remote -v
```

## 2. Đổi remote origin sang account 1

```powershell
git remote set-url origin git@github-acc1:<username>/<repo>.git
```

## 3. Đổi remote origin sang account 2

```powershell
git remote set-url origin git@github-acc2:<username>/<repo>.git
```

## 4. Kiểm tra lại

```powershell
git remote -v
```

Bạn cần thấy fetch/push URL trỏ về đúng host:
- github-acc1 hoặc github-acc2

## 5. Nếu chưa có origin

```powershell
git remote add origin git@github-acc1:<username>/<repo>.git
```

hoặc

```powershell
git remote add origin git@github-acc2:<username>/<repo>.git
```

## 6. Push nhánh chính

```powershell
git branch -M main
git push -u origin main
```
