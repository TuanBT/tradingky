# Performance Issues & Fix Proposals

> Audit date: 2025-01  
> App version: 0.7.3 | Next.js 16.1.6 | Firebase 12.10.0  
> Build: 2.2 MB raw JS / ~667 KB gzipped (estimate)
> **Status: ALL 6 ISSUES FIXED ✅**

---

## 1. 🔴 CRITICAL — N+1 Query: `getRegisteredUsers()` (Admin)

**File:** `src/lib/services.ts` — `getRegisteredUsers()` (~line 340-379)

**Vấn đề:**
- Fetch tất cả users (1 query), rồi loop qua MỖI user fetch toàn bộ trades riêng
- 100 users = 101 Firestore reads + load TOÀN BỘ trade documents vào memory
- `orderBy("date", "desc")` trên mỗi user → full collection scan per user

**Cách fix:**
- **Option A (Recommended):** Lưu aggregate stats (`tradeCount`, `totalPnl`, `winRate`, `lastTradeDate`) trực tiếp trên `users/{uid}` document. Update stats mỗi khi tạo/sửa/xóa trade (dùng Cloud Function hoặc client-side update).
  - **Pros:** 1 query duy nhất cho admin panel, O(1) per user
  - **Cons:** Cần migration cho data cũ, cần đảm bảo consistency

- **Option B (Quick fix):** Dùng `getCountFromServer()` (Firebase v9.12+) để đếm trades mà không cần load documents:
  ```typescript
  const countSnap = await getCountFromServer(collection(db, "users", uid, "trades"));
  const tradeCount = countSnap.data().count;
  ```
  - **Pros:** Giảm data transfer (không load full trade documents)
  - **Cons:** Vẫn N queries, không có totalPnl/winRate

- **Option C:** Giữ parallel fetch nhưng chỉ load `pnl` và `result` fields (Firestore không hỗ trợ field selection → không khả thi trực tiếp, nhưng có thể tạo summary subcollection)

**Đề xuất:** Option A — aggregate trên user document, thêm Cloud Function `onWrite` trigger cho trades.

---

## 2. 🔴 CRITICAL — Following Feed không có cursor pagination

**File:** `src/lib/services.ts` — `getCommunityFeedFollowing()` (~line 810-858)

**Vấn đề:**
- Load TẤT CẢ posts từ tất cả followed users (không có `limit()` trong query)
- Client-side pagination bằng array slice → vẫn load tất cả vào memory trước
- Follow 10 người, mỗi người 50 posts = 500 documents load cùng lúc

**Cách fix:**
- **Option A (Recommended):** Thêm `limit()` vào mỗi chunk query, dùng `startAfter` cursor:
  ```typescript
  // Mỗi chunk query thêm limit
  const q = query(
    collection(db, "shared_trades"),
    where("public", "==", true),
    where("ownerUid", "in", chunk),
    orderBy("createdAt", "desc"),
    limit(pageSize * 2) // Load nhiều hơn pageSize để merge-sort
  );
  ```
  Sau đó merge-sort kết quả từ các chunks và lấy top `pageSize` items.

- **Option B:** Dùng collection group query + composite index nếu restructure data:
  ```
  Composite index: shared_trades(public ASC, createdAt DESC)
  ```
  Đã có sẵn query này cho "all" feed → có thể reuse.

- **Option C:** Cache following feed trong client state (sessionStorage/React state) và chỉ refetch khi có new posts (dùng `createdAt > lastLoadTime`).

**Đề xuất:** Option A — thêm limit per chunk + merge-sort. Kết hợp Option C cho cache.

---

## 3. 🟠 HIGH — Suggested Users query nặng

**File:** `src/lib/services.ts` — `getSuggestedUsers()` (~line 877-905)

**Vấn đề:**
- Scan 200 posts gần nhất mỗi lần load community page
- ~200 Firestore document reads PER page visit
- Chạy lại mỗi khi follow/unfollow

**Cách fix:**
- **Option A (Recommended):** Cache kết quả trong sessionStorage với TTL (ví dụ 10 phút):
  ```typescript
  const CACHE_KEY = "suggested_users";
  const CACHE_TTL = 10 * 60 * 1000; // 10 phút

  export async function getSuggestedUsers(currentUid: string, maxResults = 5) {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
    // ... existing logic ...
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
    return result;
  }
  ```

- **Option B:** Tạo server-side aggregation (Cloud Function scheduled) tính popular users hàng ngày, lưu vào collection `popular_users`. Client chỉ cần 1 query.

- **Option C:** Giảm limit từ 200 xuống 50 posts → ít accuracy hơn nhưng 75% ít reads.

**Đề xuất:** Option A (cache sessionStorage) — quick win, giảm 95% reads.

---

## 4. 🟠 HIGH — Per-Card duplicate Firestore calls (TradePostCard)

**File:** `src/components/TradePostCard.tsx` (~line 66-96)

**Vấn đề:**
- Mỗi TradePostCard gọi `hasUserLiked(postId, userId)` riêng = 1 Firestore read
- Mỗi card gọi `getUserRole(userId)` riêng = 1 Firestore read
- 20 cards trên page = 40 extra reads
- Ref guard (`likeChecked`, `roleChecked`) chỉ ngăn re-fetch trong cùng 1 card instance

**Cách fix:**
- **Option A (Recommended):** Batch fetch ở parent component, truyền qua props:
  ```typescript
  // Trong community/page.tsx hoặc parent
  const userLikes = useMemo(() => new Set<string>(), []);
  
  // Batch check: getUserLikedPosts(userId, postIds) - tạo function mới
  useEffect(() => {
    if (!user) return;
    const postIds = posts.map(p => p.id);
    batchCheckLikes(user.uid, postIds).then(likedSet => setUserLikes(likedSet));
  }, [posts, user]);
  
  // Pass to card
  <TradePostCard initialLiked={userLikes.has(post.id)} userRole={currentUserRole} />
  ```

- **Option B:** Cache `getUserRole()` kết quả globally (role ít thay đổi):
  ```typescript
  // Trong AuthProvider, fetch role 1 lần khi login
  const [userRole, setUserRole] = useState<UserRole>("user");
  ```

- **Option C:** Dùng `getAll()` batch read (Firebase Admin SDK only — không khả thi client-side).

**Đề xuất:** Option B (cache role trong AuthProvider) + Option A (batch likes ở parent).

---

## 5. 🟡 MEDIUM — Không dùng next/image

**Files:** Multiple (`trades/page.tsx`, `TradePostCard.tsx`, `TradeDetailView.tsx`, etc.)

**Vấn đề:**
- Dùng raw `<img>` tag thay vì `next/image`
- Không lazy loading cho off-screen images
- Google Drive URLs dùng `sz=w2000` cố định → không responsive
- Không có blur placeholder

**Cách fix:**
- **Option A:** Thay `<img>` bằng `next/image` với `unoptimized={true}` (vì Google Drive URLs external):
  ```tsx
  import Image from "next/image";
  <Image
    src={getImageSrc(url)}
    alt="Chart"
    width={800}
    height={450}
    unoptimized
    loading="lazy"
    className="..."
  />
  ```
  - **Lưu ý:** Cần thêm `images.remotePatterns` trong `next.config.ts` cho Google Drive domain

- **Option B (Quick fix):** Thêm `loading="lazy"` vào tất cả `<img>` tags:
  ```tsx
  <img src={url} loading="lazy" alt="Chart" />
  ```

- **Option C:** Tạo responsive image URLs dựa trên viewport:
  ```typescript
  function getResponsiveImageSrc(url: string, width: number) {
    return url.replace(/sz=w\d+/, `sz=w${width}`);
  }
  ```

**Đề xuất:** Option B trước (quick win) → Option A sau khi setup next.config.

---

## 6. 🟡 MEDIUM — Admin Reports N+1

**File:** `src/lib/services.ts` — `getAllReports()` (~line 912-940)

**Vấn đề:**
- Fetch tất cả public shared_trades → loop fetch reports subcollection mỗi trade
- Batch 10 concurrent, nhưng vẫn N/10 rounds
- 500 shared trades = 51 Firestore requests

**Cách fix:**
- **Option A (Recommended):** Thêm `reportCount` field trên `shared_trades` document. Chỉ query trades có `reportCount > 0`:
  ```typescript
  const q = query(
    collection(db, "shared_trades"),
    where("reportCount", ">", 0),
    orderBy("reportCount", "desc")
  );
  ```
  - Cần update `reportCount` khi add/delete report (increment/decrement)

- **Option B:** Tạo top-level `reports` collection thay vì subcollection → 1 query duy nhất.

**Đề xuất:** Option A — thêm `reportCount` field + composite index.

---

## Priority Matrix

| # | Issue | Impact | Effort | Priority |
|---|-------|--------|--------|----------|
| 1 | Admin N+1 `getRegisteredUsers` | Critical | 2-3h | P0 |
| 2 | Following Feed pagination | Critical | 1-2h | P0 |
| 3 | Suggested Users cache | High | 30min | P1 |
| 4 | Per-Card batch queries | High | 1-2h | P1 |
| 5 | Image lazy loading | Medium | 30min | P2 |
| 6 | Admin Reports N+1 | Medium | 1-2h | P2 |

---

## ✅ Điểm tốt hiện tại
- FontAwesome tree-shaking (import từng icon)
- Optimistic UI updates (likes)
- Promise.all() cho parallel loading
- IntersectionObserver infinite scroll + cleanup
- useMemo/useCallback cho expensive computations
- Rate limiting (token bucket)
- writeBatch() cho multi-doc operations
- Firestore "in" query chunking (30 limit)
- Client-side filtering (filterTrades) — không query Firestore lại
