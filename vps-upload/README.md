# VPS Upload Server — Hướng dẫn cài đặt

Server upload ảnh chart cho TradingKý. Chạy trên VPS Windows, nhận file từ frontend → lưu vào disk → trả URL.

## Thông tin hiện tại
- **VPS**: Vietnix Windows Server 2022
- **IP**: 14.225.217.152
- **Port**: 3001
- **Upload URL**: `http://14.225.217.152:3001`
- **Node.js**: v22.16.0
- **Code**: `C:\tradingky-upload\`
- **Uploads**: `C:\tradingky-uploads\`
- **Auto-start**: Windows Scheduled Task "TradingKYUpload" (runs on SYSTEM boot)

## Quản lý server

### Kiểm tra server đang chạy
```powershell
# Từ VPS
Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing

# Từ bên ngoài
curl http://14.225.217.152:3001/health
```

### Khởi động lại server
```bash
taskkill /f /im node.exe
schtasks /run /tn TradingKYUpload
```

### Xem logs
Logs nằm tại:
- `C:\tradingky-upload\stdout.log`
- `C:\tradingky-upload\stderr.log`

## Cài đặt mới trên VPS khác

### 1. Cài Node.js
```powershell
# Download và cài Node.js
Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi" -OutFile "C:\node-installer.msi"
msiexec /i C:\node-installer.msi /qn /norestart
```

### 2. Copy files
Copy 2 folder lên VPS mới:
- `C:\tradingky-upload\` (code — hoặc scp từ repo `vps-upload/`)
- `C:\tradingky-uploads\` (ảnh đã upload)

### 3. Cài dependencies
```bash
cd C:\tradingky-upload
npm install
```

### 4. Tạo `.env` (hoặc copy từ VPS cũ)
```
PORT=3001
UPLOAD_DIR=C:\tradingky-uploads
API_KEY=90174dbc7c6bb5c6d41a7c5a6678ca39f90c8bf236345d1f2df024f176583ca4
ALLOWED_ORIGINS=https://tradingky.vercel.app,http://localhost:3000,https://tradingky.buitientuan.com
```

### 5. Mở firewall
```bash
netsh advfirewall firewall add rule name="TradingKY Upload" dir=in action=allow protocol=TCP localport=3001
```

### 6. Tạo auto-start task
```bash
schtasks /create /sc ONSTART /tn TradingKYUpload /tr C:\tradingky-upload\start-server.bat /ru SYSTEM /f
```

### 7. Khởi động server (lần đầu hoặc sau khi restart)
```bash
schtasks /run /tn TradingKYUpload
```

### 8. Cập nhật Vercel
Vào Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_UPLOAD_URL` = `http://<IP_MỚI>:3001`
- Redeploy

## Cấu hình Vercel (Environment Variables)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_UPLOAD_URL` | `http://14.225.217.152:3001` |
| `NEXT_PUBLIC_UPLOAD_API_KEY` | `90174dbc7c6bb5c6d41a7c5a6678ca39f90c8bf236345d1f2df024f176583ca4` |

Cũng thêm vào `.env.local` để dev local.

## Cấu trúc file trên VPS

```
C:\tradingky-uploads\          ← Folder chứa ảnh
  └── <uid>/                   ← Mỗi user 1 folder
      ├── 1234567890-a1b2.png
      └── 1234567891-c3d4.jpg

C:\tradingky-upload\           ← Code server
  ├── server.js
  ├── package.json
  ├── .env
  └── node_modules/
```
