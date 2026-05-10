# Setup SSH cho 2 tài khoản GitHub (Windows + VS Code)

Mục tiêu:
- Dùng account 1 cho Copilot: vitrannhat@gmail.com
- Dùng cả 2 account linh hoạt khi push code

## 1. Tạo SSH key cho từng account

```powershell
ssh-keygen -t ed25519 -C "vitrannhat@gmail.com" -f "$env:USERPROFILE\.ssh\id_github_account1"
ssh-keygen -t ed25519 -C "vitrannhat1@gmail.com" -f "$env:USERPROFILE\.ssh\id_github_account2"
```

Ghi chú:
- Có thể bấm Enter để bỏ qua passphrase, hoặc đặt passphrase nếu muốn tăng bảo mật.

## 2. Tạo file SSH config

Mở file config:

```powershell
notepad $env:USERPROFILE\.ssh\config
```

Dán nội dung:

```sshconfig
Host github-acc1
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_github_account1
    AddKeysToAgent yes

Host github-acc2
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_github_account2
    AddKeysToAgent yes
```

## 3. Add public key vào đúng tài khoản GitHub

Copy key account 1:

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_github_account1.pub" | Set-Clipboard
```

Copy key account 2:

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_github_account2.pub" | Set-Clipboard
```

Trên GitHub từng account:
- Settings
- SSH and GPG keys
- New SSH key
- Paste key

## 4. Test kết nối

```powershell
ssh -T git@github-acc1
ssh -T git@github-acc2
```

Kỳ vọng:
- Hi <username>! You've successfully authenticated...

## 5. Checklist nhanh

- Đã có 2 cặp key trong thư mục ~/.ssh
- File ~/.ssh/config có 2 host: github-acc1, github-acc2
- Mỗi public key đã add đúng account
- Test ssh -T đều thành công
