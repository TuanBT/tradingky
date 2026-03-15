# Trading Ký — App Flow Diagram

## 1. Tổng quan Navigation (Mermaid)

```mermaid
flowchart TD
    START([User truy cập app]) --> AUTH{Đã đăng nhập?}
    
    AUTH -->|Chưa| LOGIN["LoginPage\nGoogle Sign-In"]
    AUTH -->|Rồi| SHELL[AppShell + Sidebar]
    
    LOGIN -->|signInWithPopup| GAUTH[Google OAuth]
    GAUTH -->|Thành công| ENSURE[ensureUserDoc + getUserRole]
    GAUTH -->|Thất bại| LOGIN
    ENSURE --> SHELL

    SHELL --> NAV{Sidebar Navigation}
    
    NAV --> TRADES["/trades\nQuản lý lệnh"]
    NAV --> STATS["/statistics\nThống kê"]
    NAV --> CHECKLIST["/checklist\nChecklist"]
    NAV --> CALENDAR["/calendar\nLịch"]
    NAV --> COMMUNITY["/community\nCộng đồng"]
    NAV --> SETTINGS["/settings\nCài đặt"]
    NAV -->|Admin only| ADMIN["/admin\nAdmin Panel"]
    
    SHELL --> THEME[Toggle Dark/Light]
    SHELL --> LOGOUT["Đăng xuất → LoginPage"]
```

---

## 2. Flow Trades Page — CRUD chính

```mermaid
flowchart TD
    TRADES["/trades"] --> VIEW_MODE{Chế độ xem?}
    
    VIEW_MODE -->|Bảng| LIST_VIEW["List View\nBảng lệnh + Filter Bar"]
    VIEW_MODE -->|Chi tiết| DETAIL_VIEW["Detail View\nXem chi tiết lệnh"]

    %% ============ LIST VIEW ============
    LIST_VIEW --> FILTER["Filter Bar\nSearch, Tâm lý, Trạng thái, Thời gian, Starred"]
    LIST_VIEW --> ADD_BTN["+ Thêm lệnh"]
    
    ADD_BTN --> MODAL_ADD["TradeEditModal\nmode = add"]
    
    LIST_VIEW --> ROW_CLICK["Click row"]
    ROW_CLICK --> TRADE_DETAIL_PAGE["/trades/id\nTrang chi tiết riêng"]
    
    LIST_VIEW --> ROW_ACTIONS{Thao tác trên row}
    ROW_ACTIONS --> STAR_TOGGLE["⭐ Toggle Star"]
    ROW_ACTIONS --> EDIT_BTN["Sửa"]
    ROW_ACTIONS --> CLOSE_BTN["Đóng lệnh\n- chỉ OPEN"]
    ROW_ACTIONS --> DELETE_BTN["Xoá"]
    ROW_ACTIONS --> IMG_CLICK["Click ảnh chart"]
    
    EDIT_BTN --> MODAL_EDIT["TradeEditModal\nmode = edit"]
    CLOSE_BTN --> MODAL_CLOSE["TradeEditModal\nmode = close"]
    DELETE_BTN --> CONFIRM_DEL["ConfirmDialog\nXoá lệnh?"]
    IMG_CLICK --> LIGHTBOX["ImageLightbox\nZoom, Pan"]
    
    CONFIRM_DEL -->|Xác nhận| DEL_ACTION["Xoá trade + ảnh GDrive\nToast: Đã xoá lệnh"]

    %% ============ DETAIL VIEW ============
    DETAIL_VIEW --> NAV_ARROWS["← → Điều hướng lệnh"]
    DETAIL_VIEW --> DETAIL_ACTIONS{Thao tác}
    
    DETAIL_ACTIONS --> D_EDIT["Sửa → TradeEditModal"]
    DETAIL_ACTIONS --> D_CLOSE["Đóng lệnh → TradeEditModal\n- chỉ OPEN"]
    DETAIL_ACTIONS --> D_DELETE["Xoá → ConfirmDialog"]
    DETAIL_ACTIONS --> D_SHARE["Chia sẻ → ShareTradeDialog\n- chỉ CLOSED"]
    DETAIL_ACTIONS --> D_STAR["⭐ Toggle Star"]
    DETAIL_ACTIONS --> D_IMG["Click chart → ImageLightbox"]
```

---

## 3. Flow Tạo / Sửa / Đóng lệnh (TradeEditModal)

```mermaid
flowchart TD
    OPEN_MODAL[Mở TradeEditModal] --> MODE{Mode?}
    
    MODE -->|add| ADD["Form trống\nKhôi phục draft nếu có"]
    MODE -->|edit| EDIT[Load dữ liệu trade hiện tại]
    MODE -->|close| CLOSE["Load trade + Prefill:\ncloseDate=today, closeTime=now\nstatus=CLOSED"]
    
    ADD --> FORM
    EDIT --> FORM
    CLOSE --> FORM
    
    FORM[Form nhập liệu] --> BASIC["Fields cơ bản\nDate, Pair, Platform, Type\nEmotion, Result, Status"]
    FORM --> ADVANCED["Nâng cao\nSL, TP, Entry Price, Exit Price\nLot Size, Timeframe, Entry Time\nClose Date, Close Time"]
    FORM --> EXIT_FIELDS["Exit Review\nExit Reason, Lessons Learned"]
    FORM --> NOTE_FIELD["Ghi chú"]
    FORM --> CHART_UPLOAD["Upload Chart Image"]
    
    CHART_UPLOAD --> GDRIVE_CHECK{Có Google Drive token?}
    GDRIVE_CHECK -->|Không| CONNECT_GD["Connect Google Drive\nOAuth lại"]
    GDRIVE_CHECK -->|Có| UPLOAD[Upload ảnh lên GDrive]
    CONNECT_GD --> UPLOAD
    UPLOAD --> THUMBNAIL[Hiển thị thumbnail]
    
    FORM --> DRAFT_SAVE["Auto-save draft mỗi 1s\nchỉ mode=add\n→ localStorage"]
    
    FORM --> VALIDATE{Validate?}
    VALIDATE -->|Thiếu fields| ERROR_TOAST["Toast lỗi"]
    VALIDATE -->|OK| SAVE_ACTION{Mode?}
    
    SAVE_ACTION -->|add| FIRESTORE_ADD["addTrade → Firestore\nToast: Đã tạo lệnh\nXoá draft"]
    SAVE_ACTION -->|edit| FIRESTORE_UPDATE["updateTrade → Firestore\nToast: Đã cập nhật"]
    SAVE_ACTION -->|close| FIRESTORE_CLOSE["updateTrade status=CLOSED\nToast: Đã đóng lệnh"]
    
    FIRESTORE_ADD --> REFRESH[Đóng modal + Refresh danh sách]
    FIRESTORE_UPDATE --> REFRESH
    FIRESTORE_CLOSE --> REFRESH
```

---

## 4. Flow Chia sẻ lệnh (ShareTradeDialog)

```mermaid
flowchart TD
    SHARE_OPEN[Mở ShareTradeDialog] --> CHECK_STATUS{Trade đã CLOSED?}
    
    CHECK_STATUS -->|OPEN| ERROR["Hiển thị lỗi:\nChỉ có thể chia sẻ lệnh đã đóng"]
    CHECK_STATUS -->|CLOSED| HAS_TOKEN{Đã có shareToken?}
    
    HAS_TOKEN -->|Chưa| FIRST_SHARE[Lần đầu chia sẻ]
    HAS_TOKEN -->|Rồi| UPDATE_SHARE[Cập nhật bài chia sẻ]
    
    FIRST_SHARE --> PRIVACY["Chọn Privacy Options\nẨn P&L\nẨn Lot Size\nẨn Entry/Exit Price"]
    
    PRIVACY --> CREATE_SHARE["shareTrade\nTạo doc shared_trades/token\nCập nhật trade.shareToken"]
    CREATE_SHARE --> GEN_URL["Tạo URL: /shared/token\nAuto-copy clipboard\nToast: Đã tạo link"]
    
    UPDATE_SHARE --> SHOW_URL["Hiển thị URL hiện tại\n+ Copy button"]
    UPDATE_SHARE --> PRIVACY_UPDATE[Sửa Privacy Options]
    PRIVACY_UPDATE --> SAVE_PRIVACY["Cập nhật Firestore\nToast: Đã cập nhật"]
    
    GEN_URL --> GOTO_POST["Nút: Đi tới bài đăng\n-> /shared/token"]
    GEN_URL --> UPDATE_BTN["Nút: Cập nhật privacy"]
    SHOW_URL --> GOTO_POST
    SHOW_URL --> UPDATE_BTN
```

---

## 5. Flow Community

```mermaid
flowchart TD
    COMMUNITY["/community"] --> TABS{Tab?}
    
    TABS -->|Tất cả| ALL_FEED["Tất cả bài chia sẻ\nInfinite scroll"]
    TABS -->|Đang theo dõi| FOLLOWING_FEED["Bài từ người đang follow"]
    TABS -->|Của tôi| MY_FEED["Bài do mình chia sẻ"]
    
    ALL_FEED --> SORT["Sort: Mới nhất, Top Likes, Top Comments"]
    ALL_FEED --> RESULT_FILTER["Filter: WIN, LOSS, BE, CANCELLED"]
    
    ALL_FEED --> CARD[TradePostCard]
    FOLLOWING_FEED --> CARD
    MY_FEED --> CARD
    
    CARD --> CARD_ACTIONS{Thao tác trên card}
    
    CARD_ACTIONS --> LIKE["Like/Unlike\n- cần đăng nhập"]
    CARD_ACTIONS --> COMMENT_TOGGLE["Mở comments"]
    CARD_ACTIONS --> AUTHOR_CLICK["Click tên tác giả"]
    CARD_ACTIONS --> CHART_VIEW["Click ảnh → ImageLightbox"]
    CARD_ACTIONS --> REPORT["Report bài viết"]
    
    LIKE --> LIKE_TX["toggleLike\nFirestore transaction\nOptimistic UI update"]
    
    COMMENT_TOGGLE --> COMMENTS[Hiển thị comments]
    COMMENTS --> ADD_COMMENT["Nhập comment + Gửi\n- text-only, cần đăng nhập"]
    COMMENTS --> DEL_COMMENT["Xoá comment\n- author, admin, mod"]
    
    AUTHOR_CLICK --> PROFILE["/profile/uid"]
    
    COMMUNITY["/community"] --> SIDEBAR_SUGGEST["Sidebar: Gợi ý người dùng\n5 random users + Follow button"]
    SIDEBAR_SUGGEST -->|Click user| PROFILE
```

---

## 6. Flow Profile & Follow

```mermaid
flowchart TD
    PROFILE["/profile/uid"] --> HEADER["Avatar + Tên + Role Badge"]
    
    HEADER --> IS_OWN{Trang của mình?}
    IS_OWN -->|Không| FOLLOW_BTN["Follow / Unfollow button"]
    IS_OWN -->|Rồi| NO_FOLLOW["Không hiện Follow"]
    
    HEADER --> FOLLOWERS_COUNT["Followers: N\nClick → Modal danh sách"]
    HEADER --> FOLLOWING_COUNT["Following: N\nClick → Modal danh sách"]
    
    PROFILE --> PUBLIC_TRADES["Danh sách bài chia sẻ\nSort: Mới nhất, Top Likes, Top Comments"]
    
    PUBLIC_TRADES --> TRADE_CARD[TradePostCard]
    TRADE_CARD --> LIKE_ACTION["Like, Comment, View chart"]
    TRADE_CARD --> OTHER_PROFILE["Click tên người comment\n-> /profile/otherUid"]
```

---

## 7. Flow Shared Trade (Public)

```mermaid
flowchart TD
    SHARED["/shared/token\nKhông cần đăng nhập"] --> LOAD["Load shared_trades/token"]
    
    LOAD --> TRADE_VIEW["Hiển thị trade detail\náp dụng privacy settings"]
    
    TRADE_VIEW --> PRIVACY_APPLIED["Ẩn theo privacy:\nP&L, Lot Size, Entry-Exit Price"]
    
    TRADE_VIEW --> ACTIONS{Thao tác}
    
    ACTIONS --> VIEW_LIKE["Like\ncần đăng nhập"]
    ACTIONS --> VIEW_COMMENTS["Xem/Thêm comments\ncần đăng nhập để comment"]
    ACTIONS --> VIEW_CHART["Click chart -> ImageLightbox"]
    ACTIONS --> VIEW_AUTHOR["Click tên tác giả -> /profile/uid"]
    ACTIONS --> VIEW_REPORT["Report"]
```

---

## 8. Flow Calendar

```mermaid
flowchart TD
    CALENDAR["/calendar"] --> MONTH_NAV["◀ Tháng trước | Tháng này | Tháng sau ▶"]
    CALENDAR --> SUMMARY["Tổng kết tháng:\nTổng trades, Wins, Losses, P&L"]
    
    CALENDAR --> GRID["Lưới tháng T2-CN"]
    
    GRID --> DAY_CELL["Mỗi ngày hiển thị:\nDaily P&L xanh/đỏ\nSố open, win, loss"]
    
    DAY_CELL -->|Click ngày| DAY_DETAIL["Mở chi tiết trades trong ngày"]
```

---

## 9. Flow Statistics

```mermaid
flowchart TD
    STATS["/statistics"] --> PERIOD["Chọn khoảng thời gian:\nHôm nay, Tuần, Tháng, 3 tháng, 6 tháng, Custom"]
    
    PERIOD --> CHARTS["Charts"]
    
    CHARTS --> BAR["Bar Chart: P&L theo ngày"]
    CHARTS --> PIE["Pie Chart: Win/Loss/BE breakdown"]
    CHARTS --> LINE["Line Chart: P&L tích luỹ"]
    
    PERIOD --> METRICS["Metrics Cards"]
    
    METRICS --> M1["Total trades"]
    METRICS --> M2["Win rate %"]
    METRICS --> M3["Profit factor"]
    METRICS --> M4["Max drawdown"]
    METRICS --> M5["Avg win / Avg loss"]
    METRICS --> M6["Best day / Worst day"]
```

---

## 10. Flow Settings

```mermaid
flowchart TD
    SETTINGS["/settings"] --> LIBRARY["Quản lý Dropdown Library"]
    
    LIBRARY --> PAIRS["Cặp tiền\nAdd, Delete items + Emoji"]
    LIBRARY --> PLATFORMS["Sàn giao dịch\nAdd, Delete items + Emoji"]
    LIBRARY --> EMOTIONS["Tâm lý\nAdd, Delete items + Emoji"]
    LIBRARY --> TIMEFRAMES["Timeframe\nAdd, Delete items + Emoji"]
    
    SETTINGS --> DATA["Import / Export"]
    DATA --> EXPORT["Export JSON\ntrades + library"]
    DATA --> IMPORT["Import JSON\nPreview -> Confirm -> Merge"]
    
    SETTINGS --> RESET["Reset to Default\n-> ConfirmDialog"]
    
    SETTINGS --> GDRIVE_CONNECT["Kết nối Google Drive\nnếu chưa có token"]
```

---

## 11. Flow Admin Panel

```mermaid
flowchart TD
    ADMIN["/admin\nAdmin only"] --> TABS{Tab?}
    
    TABS -->|Users| USERS_TAB["Quản lý Users"]
    TABS -->|Reports| REPORTS_TAB["Quản lý Reports"]
    
    USERS_TAB --> USER_TABLE["Bảng users:\nUID, Email, Name, Role, Status"]
    
    USER_TABLE --> ACTIONS{Thao tác}
    ACTIONS --> CHANGE_ROLE["Đổi Role\nadmin, mod, user\nSuper-admin không thể đổi"]
    ACTIONS --> BAN_UNBAN["Ban / Unban user"]
    ACTIONS --> RESET_TRADES["Reset trades → ConfirmDialog"]
    ACTIONS --> RESET_ALL["Reset toàn bộ data → ConfirmDialog (danger)"]
    
    USERS_TAB --> SMOKE_TEST["Tạo Smoke Test data"]
    USERS_TAB --> ACTIVITY_LOG["Activity Log: Lịch sử thao tác"]
    
    REPORTS_TAB --> REPORT_TABLE["Bảng reports:\nID, Post, Reporter, Reason, Date"]
    REPORT_TABLE --> R_ACTIONS{Thao tác}
    R_ACTIONS --> VIEW_POST["Xem bài → /shared/token"]
    R_ACTIONS --> DEL_REPORT["Xoá report → ConfirmDialog"]
    R_ACTIONS --> DEL_SHARED["Xoá bài viết → ConfirmDialog (danger)"]
```

---

## 12. Flow Checklist

```mermaid
flowchart TD
    CHECKLIST["/checklist"] --> PRE["PRE-TRADE Checklist\nVD: Phân tích xu hướng, Xác định SR"]
    CHECKLIST --> POST["POST-TRADE Checklist\nVD: Vào đúng setup, Quản lý rủi ro"]
    
    PRE --> CHECK_ACTIONS{Thao tác}
    POST --> CHECK_ACTIONS
    
    CHECK_ACTIONS --> TOGGLE["Toggle checkbox\n-> localStorage"]
    CHECK_ACTIONS --> ADD_ITEM["+ Thêm item\n-> localStorage"]
    CHECK_ACTIONS --> REMOVE_ITEM["Xoá item\n-> localStorage"]
    CHECK_ACTIONS --> RESET_CL["Reset checklist\n-> Khôi phục mặc định"]
```

---

## 13. Tổng quan Auth & Role-Based Access

```mermaid
flowchart TD
    USER_TYPE{Loại user?}
    
    USER_TYPE -->|Chưa đăng nhập| GUEST["Guest"]
    USER_TYPE -->|User thường| NORMAL["User"]
    USER_TYPE -->|Moderator| MOD["Mod"]
    USER_TYPE -->|Admin| ADMIN_ROLE["Admin"]
    
    GUEST --> G_CAN["Xem /shared/token\nXem /profile/uid\nXem comments\nKHÔNG: Like, Comment, Report\nKHÔNG: Truy cập app chính"]
    
    NORMAL --> N_CAN["CRUD trades của mình\nLike, Comment, Report\nFollow users\nChia sẻ lệnh\nKHÔNG: Xoá comment người khác\nKHÔNG: Truy cập /admin"]
    
    MOD --> M_CAN["Tất cả quyền User\nXoá comment của người khác\nKHÔNG: Truy cập /admin\nKHÔNG: Quản lý users"]
    
    ADMIN_ROLE --> A_CAN["Tất cả quyền Mod\nTruy cập /admin\nĐổi role, Ban users\nReset data users\nXoá reports & shared trades\nSuper-admin không thể bị hạ cấp"]
```

---

## 14. Data Flow Overview

```mermaid
flowchart LR
    subgraph Client["Browser"]
        APP[Next.js App]
        LS["localStorage\ntheme, draft, checklist"]
        SS["sessionStorage\nGDrive token"]
    end
    
    subgraph Firebase
        AUTH_SVC["Firebase Auth\nGoogle Sign-In"]
        FS["Firestore"]
        
        subgraph Collections
            USERS["users/uid"]
            TRADES_COL["users/uid/trades"]
            JOURNAL["users/uid/dailyJournal"]
            LIBRARY["users/uid/settings/dropdownLibrary"]
            SHARED["shared_trades/token"]
            REPORTS["community_reports"]
            FOLLOW["users/uid/following & followers"]
        end
    end
    
    subgraph Google
        GDRIVE["Google Drive\nChart images"]
    end
    
    APP <-->|Auth| AUTH_SVC
    APP <-->|CRUD| FS
    APP <-->|Upload/Delete images| GDRIVE
    APP <-->|Local state| LS
    APP <-->|Token cache| SS
    
    FS --- Collections
```
