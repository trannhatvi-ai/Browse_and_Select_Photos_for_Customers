# Các lệnh Git cơ bản cần biết

Tài liệu này gom các lệnh Git thường dùng nhất cho workflow hằng ngày.

## 1. Khởi tạo và kết nối repo

```powershell
git init
git clone <repo-url>
git remote -v
git remote add origin <repo-url>
git remote set-url origin <repo-url>
git remote remove origin
```

## 2. Kiểm tra trạng thái và lịch sử

```powershell
git status
git log --oneline --graph --decorate --all
git show <commit>
git diff
git diff --staged
```

## 3. Stage và commit

```powershell
git add .
git add <file>
git restore --staged <file>
git commit -m "message"
git commit --amend -m "new message"
```

## 4. Branch cơ bản

```powershell
git branch
git branch -a
git checkout -b <new-branch>
git switch -c <new-branch>
git switch <branch>
git branch -d <branch>
```

## 5. Push/Pull/Fetch

```powershell
git fetch
git pull
git pull --rebase
git push
git push -u origin <branch>
```

## 6. Đồng bộ thay đổi và xử lý xung đột

```powershell
git merge <branch>
git rebase <branch>
git rebase --continue
git merge --abort
git rebase --abort
```

## 7. Undo cơ bản

```powershell
git restore <file>
git checkout -- <file>
git reset HEAD <file>
git revert <commit>
```

Lưu ý:
- Ưu tiên git revert khi muốn đảo commit đã push để an toàn lịch sử.

## 8. Tag và release cơ bản

```powershell
git tag
git tag v1.0.0
git push origin v1.0.0
git push origin --tags
```

## 9. Stash tạm thay đổi

```powershell
git stash
git stash list
git stash pop
git stash apply
```

## 10. Cấu hình Git quan trọng

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config user.name "Your Name"
git config user.email "you@example.com"
git config --list
```

## 11. Workflow nhanh mỗi ngày

```powershell
git status
git add .
git commit -m "feat: update ..."
git pull --rebase
git push
```

## 12. Workflow an toàn trước khi publish

```powershell
git config user.email
git remote -v
git branch
```

Nếu cả 3 thông tin đúng thì mới push.
