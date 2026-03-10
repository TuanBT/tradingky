# Google Drive Storage — Hướng dẫn cài đặt

Branch `feature/google-drive-storage` thay thế VPS upload bằng Google Drive cá nhân.
Ảnh chart được lưu trực tiếp vào Google Drive của user đã đăng nhập.

## Cách hoạt động

1. User đăng nhập bằng Google → app xin thêm quyền **Google Drive** (`drive.file`)
2. Upload ảnh → file được tạo trong folder **TradingKy** trên Drive của user
3. File được set public (anyone with link) để hiển thị `<img>`
4. Xoá ảnh → file bị xoá khỏi Drive
5. Xoá trade → tất cả ảnh của trade cũng bị xoá khỏi Drive

## Yêu cầu: Google Cloud Console

Vì app xin quyền truy cập Google Drive, bạn cần cấu hình Google Cloud project.

### Bước 1: Vào Google Cloud Console

1. Truy cập https://console.cloud.google.com/
2. Đăng nhập bằng tài khoản Google mà bạn dùng cho Firebase project
3. Chọn project Firebase hiện tại (hoặc tạo mới nếu chưa có)

### Bước 2: Enable Google Drive API

1. Vào **APIs & Services** → **Library**
2. Tìm **Google Drive API**
3. Click **Enable**

### Bước 3: Cấu hình OAuth Consent Screen

1. Vào **APIs & Services** → **OAuth consent screen**
2. Chọn **External** (hoặc Internal nếu đang dùng Google Workspace)
3. Điền thông tin:
   - **App name**: TradingKý
   - **User support email**: email của bạn
   - **Developer contact email**: email của bạn
4. Ở mục **Scopes**, thêm:
   - `https://www.googleapis.com/auth/drive.file`
5. Ở mục **Test users** (nếu External + Testing):
   - Thêm email Google mà bạn dùng để test
6. Save

> ⚠️ Khi ở trạng thái "Testing", chỉ các test users mới đăng nhập được.
> Khi muốn public, submit để Google review (mất vài ngày).

### Bước 4: Kiểm tra OAuth Client ID

Firebase project đã có OAuth 2.0 Client ID (tự tạo khi enable Google Sign-In trong Firebase Auth).
Không cần tạo thêm client ID mới. Chỉ cần đảm bảo:

1. Vào **APIs & Services** → **Credentials**
2. Tìm "Web client (auto created by Google Service)" hoặc tương tự
3. Kiểm tra **Authorized redirect URIs** có chứa domain của bạn

## Kiểm tra hoạt động

1. Deploy app (Vercel) hoặc chạy local `npm run dev`
2. Đăng nhập bằng Google → sẽ thấy thêm popup xin quyền Google Drive
3. Thêm lệnh mới → upload ảnh chart → ảnh lưu vào Google Drive
4. Kiểm tra Google Drive → folder "TradingKy" xuất hiện
5. Xoá ảnh trong app → file trong Drive cũng bị xoá

## Backward Compatibility

- Các trade cũ có ảnh VPS (`/api/files/...`) vẫn hiển thị được qua proxy
- Xoá trade cũ sẽ xoá ảnh VPS qua proxy như trước
- Upload mới sẽ dùng Google Drive (URL dạng `gdrive:{fileId}`)

## Cấu trúc file đã thay đổi

| File | Thay đổi |
|---|---|
| `src/lib/firebase.ts` | Thêm `drive.file` scope cho Google provider |
| `src/components/AuthProvider.tsx` | Lưu + cung cấp Google access token |
| `src/lib/gdrive.ts` | **MỚI** — Google Drive API (upload, delete, URL helpers) |
| `src/lib/services.ts` | Upload/delete dùng Drive API thay VPS |
| `src/components/TradeEditModal.tsx` | Dùng access token + `getImageSrc()` |
| `src/app/trades/page.tsx` | Dùng `getImageSrc()`, `getImageLink()`, pass token cho delete |
| `src/app/trades/[id]/page.tsx` | Dùng `getImageSrc()`, `getImageLink()` |

## Lưu ý

- Token Google OAuth hết hạn sau ~1 giờ → app tự re-authenticate khi cần
- `drive.file` scope chỉ truy cập được file do app tạo → an toàn
- Không cần VPS server nữa cho upload ảnh mới (VPS chỉ cần cho ảnh cũ)
