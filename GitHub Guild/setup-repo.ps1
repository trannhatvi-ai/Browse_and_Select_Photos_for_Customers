# ============================================================================
# Setup Git Repository with Multiple GitHub Accounts
# ============================================================================
# Purpose: Automatically initialize a git repo and configure it for a 
#          specific GitHub account (Account 1 or Account 2)
# 
# Usage:
#   .\setup-repo.ps1 -ProjectName "my-project" -Account 1
#   .\setup-repo.ps1 -ProjectName "my-project" -Account 2 -Username "your-github-username"
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,
    
    [Parameter(Mandatory=$false)]
    [int]$Account = 1,
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "your-github-username",
    
    [Parameter(Mandatory=$false)]
    [string]$FullName = "Your Name"
)

# ============================================================================
# Configuration
# ============================================================================

$accounts = @{
    1 = @{
        email = "vitrannhat@gmail.com"
        host = "github-acc1"
        description = "Account 1 (Copilot - Primary)"
    }
    2 = @{
        email = "vitrannhat1@gmail.com"
        host = "github-acc2"
        description = "Account 2 (Personal)"
    }
}

# ============================================================================
# Validation
# ============================================================================

if (-not $accounts.ContainsKey($Account)) {
    Write-Host "❌ Error: Account must be 1 or 2" -ForegroundColor Red
    exit 1
}

if ($Username -eq "your-github-username") {
    Write-Host "⚠️  Warning: Please update -Username parameter with your actual GitHub username" -ForegroundColor Yellow
}

# ============================================================================
# Setup
# ============================================================================

$accountConfig = $accounts[$Account]
$email = $accountConfig.email
$host = $accountConfig.host
$description = $accountConfig.description

Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "🔧 SETTING UP GIT REPOSITORY" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

Write-Host "`n📂 Creating project: $ProjectName"
Write-Host "👤 Using account: $description"
Write-Host "📧 Email: $email`n"

# Step 1: Create and init repo
try {
    Write-Host "Step 1: Initializing git repository..." -ForegroundColor Yellow
    
    if (Test-Path $ProjectName) {
        Write-Host "⚠️  Directory '$ProjectName' already exists. Skipping creation." -ForegroundColor Yellow
        cd $ProjectName
    } else {
        mkdir $ProjectName | Out-Null
        cd $ProjectName
        Write-Host "✅ Directory created" -ForegroundColor Green
    }
    
    if (Test-Path .git) {
        Write-Host "⚠️  Git repository already exists" -ForegroundColor Yellow
    } else {
        git init | Out-Null
        Write-Host "✅ Git repository initialized" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Configure git user
try {
    Write-Host "`nStep 2: Configuring git user..." -ForegroundColor Yellow
    
    git config user.name $FullName
    git config user.email $email
    
    $configuredName = git config user.name
    $configuredEmail = git config user.email
    
    Write-Host "✅ Name: $configuredName" -ForegroundColor Green
    Write-Host "✅ Email: $configuredEmail" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Display next steps
Write-Host "`nStep 3: Next steps..." -ForegroundColor Yellow

$remoteUrl = "git@$host`:$Username/$ProjectName.git"

Write-Host "`n📋 To add remote to GitHub:" -ForegroundColor Cyan
Write-Host "   git remote add origin $remoteUrl" -ForegroundColor Gray

Write-Host "`n📋 To verify configuration:" -ForegroundColor Cyan
Write-Host "   git config user.email         (should show: $email)" -ForegroundColor Gray
Write-Host "   git remote -v                 (should show: $host)" -ForegroundColor Gray

Write-Host "`n📋 To start committing:" -ForegroundColor Cyan
Write-Host "   echo '# $ProjectName' > README.md" -ForegroundColor Gray
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Initial commit'" -ForegroundColor Gray
Write-Host "   git branch -M main" -ForegroundColor Gray
Write-Host "   git push -u origin main" -ForegroundColor Gray

# Display summary
Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "✨ SETUP COMPLETE!" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "`n📂 Project path: $(Get-Location)" -ForegroundColor Green
Write-Host "👤 Git account: $email" -ForegroundColor Green
Write-Host "🔌 SSH host: $host" -ForegroundColor Green
Write-Host "`n"

# ============================================================================
# Helper Functions - Can be called separately
# ============================================================================

function Switch-GitAccount {
    <#
    .SYNOPSIS
    Switch git account for current repository
    
    .EXAMPLE
    Switch-GitAccount -Account 2
    #>
    param(
        [Parameter(Mandatory=$true)]
        [int]$Account
    )
    
    if (-not $accounts.ContainsKey($Account)) {
        Write-Host "❌ Invalid account number" -ForegroundColor Red
        return
    }
    
    $config = $accounts[$Account]
    git config user.email $config.email
    Write-Host "✅ Switched to: $($config.description) ($($config.email))" -ForegroundColor Green
}

function Verify-GitConfig {
    <#
    .SYNOPSIS
    Verify current git configuration
    
    .EXAMPLE
    Verify-GitConfig
    #>
    Write-Host "`n📋 CURRENT GIT CONFIGURATION" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    
    $name = git config user.name
    $email = git config user.email
    $remoteUrl = git remote get-url origin 2>$null
    
    Write-Host "Name: $name"
    Write-Host "Email: $email"
    
    if ($remoteUrl) {
        Write-Host "Remote: $remoteUrl"
        
        if ($remoteUrl -match "github-acc1") {
            Write-Host "Account: 🔴 Account 1 (vitrannhat@gmail.com)" -ForegroundColor Green
        }
        elseif ($remoteUrl -match "github-acc2") {
            Write-Host "Account: 🔵 Account 2 (vitrannhat1@gmail.com)" -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "Remote: Not configured" -ForegroundColor Yellow
    }
    Write-Host "`n"
}

# Export functions for reuse
Export-ModuleMember -Function Switch-GitAccount, Verify-GitConfig
