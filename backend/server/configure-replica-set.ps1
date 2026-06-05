# configure-replica-set.ps1
# Script này yêu cầu quyền Administrator để cấu hình MongoDB Replica Set trên Windows

$configFile = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"

if (-not (Test-Path $configFile)) {
    Write-Error "Không tìm thấy file cấu hình tại $configFile"
    Read-Host "Nhan Enter de thoat"
    exit
}

Write-Host "=== Cau hinh MongoDB Replica Set ==="

# Doc file config
$content = Get-Content $configFile -Raw

# Thay the hoac them cau hinh replication
if ($content -match "replication:") {
    Write-Host "Cau hinh replication da ton tai."
} else {
    Write-Host "Dang them cau hinh replication vao file..."
    $content = $content -replace "#replication:", "replication:`r`n  replSetName: `"rs0`""
}

# Ghi lai file config
try {
    Set-Content -Path $configFile -Value $content -Force
    Write-Host "Da cap nhat file cau hinh mongod.cfg thanh cong!"
} catch {
    Write-Error "Loi khi ghi file cau hinh: $_"
    Read-Host "Nhan Enter de thoat"
    exit
}

# Restart Service MongoDB
Write-Host "Dang khoi dong lai dich vu MongoDB..."
try {
    Restart-Service -Name "MongoDB" -Force
    Write-Host "Da khoi dong lai dich vu MongoDB thanh cong!"
} catch {
    Write-Error "Loi khi khoi dong lai dich vu MongoDB: $_"
    Write-Host "Thu dung lenh net stop/start..."
    net stop MongoDB
    net start MongoDB
}

# Doi 5 giay de MongoDB khoi dong lai hoan toan
Start-Sleep -Seconds 5

# Chay rs.initiate() qua mongosh
Write-Host "Dang khoi tao Replica Set (rs.initiate())..."
$mongoshPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongosh.exe"
if (-not (Test-Path $mongoshPath)) {
    $mongoshPath = "mongosh"
}

try {
    & $mongoshPath --eval "rs.initiate()"
    Write-Host "Da khoi tao Replica Set thanh cong!"
} catch {
    Write-Error "Loi khi khoi tao Replica Set: $_"
}

Read-Host "Nhan Enter de hoan tat va dong cua so nay"
