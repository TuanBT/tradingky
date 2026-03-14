# Trading Ký — Copilot Instructions

## Project Overview
Trading Ký is a Vietnamese trading journal PWA built with **Next.js 16** (Turbopack), **Firebase Firestore**, **Google Drive REST API** for image storage, **Tailwind CSS**, and **FontAwesome** icons (solid + regular).

Production: https://tradingky.buitientuan.com/ (Vercel)
Firebase project: `tradingky-tuan`

## Tech Stack
- **Framework**: Next.js 16.1.6 with App Router, all pages are `"use client"` components
- **Database**: Firebase Firestore (see Firestore Structure below)
- **Auth**: Firebase Auth with Google Sign-In (`signInWithPopup` + `signInWithRedirect` fallback)
- **Image Storage**: Google Drive REST API via `drive.file` scope, tokens cached in sessionStorage (50min TTL)
- **Styling**: Tailwind CSS 4 with custom CSS variables for theming. Responsive breakpoints: sm(640), md(768), lg(1024)
- **Icons**: FontAwesome 7 — `@fortawesome/free-solid-svg-icons` and `@fortawesome/free-regular-svg-icons`. **NO emojis in rendered UI** — use FontAwesome icons instead
- **UI Components**: shadcn/ui in `src/components/ui/` (badge, button, calendar, card, dialog, dropdown-menu, input, label, popover, select, separator, sheet, switch, table, tabs, textarea, tooltip)
- **Date**: date-fns with `vi` locale, use `parseISO` for date strings
- **PWA**: Service worker at `public/sw.js`, manifest with `"orientation": "portrait"`

## File Structure
```
src/
  app/
    layout.tsx          — Root layout (viewport, metadata, inline scripts for theme/SW/orientation)
    page.tsx            — Redirects to /trades
    trades/page.tsx     — Main trade journal: list/detail views, CRUD, filters, share
    trades/[id]/page.tsx — Individual trade detail page
    calendar/page.tsx   — Monthly calendar grid with P&L per day
    statistics/page.tsx — Charts (bar, pie, line), period selector, performance metrics
    review/page.tsx     — Redirects to /trades?view=detail
    checklist/page.tsx  — Pre/post trade checklists (localStorage persisted)
    community/page.tsx  — Public community feed with likes, comments, result filter
    settings/page.tsx   — Manage dropdown library (pairs/emotions/platforms/timeframes), import/export
    shared/[token]/page.tsx — Public share link viewer (read-only, no auth required)
    admin/page.tsx      — Admin panel: user management, roles, bans, data tools, logs
  components/
    AppShell.tsx        — Layout wrapper with Sidebar + auth check
    AuthProvider.tsx    — Firebase Auth context, Google token management (useAuth hook)
    Sidebar.tsx         — Navigation menu, theme toggle, user info
    LoginPage.tsx       — Sign-in with Google page
    Providers.tsx       — Root provider stack (Auth, Theme, Toast, Filters)
    ThemeProvider.tsx    — Dark/light mode toggle (localStorage "theme" key)
    ToastProvider.tsx    — Toast notifications (success, error, warning, info) — useToast hook
    TradeFilterContext.tsx — Filter state context (search, emotion, status, dateRange, starred)
    TradeFilterBar.tsx  — UI for filtering trades
    TradeEditModal.tsx  — Dialog to create/edit/close trades with draft autosave
    EditableSelect.tsx  — Custom dropdown with inline add/edit/delete + emoji picker
    ShareTradeDialog.tsx — Share trade dialog with privacy toggles + community publish option
    ImageLightbox.tsx   — Zoom/pan image viewer, pinch-to-zoom on mobile
    ConfirmDialog.tsx   — Confirmation prompt (danger/warning/default variants)
    ui/                 — shadcn/ui components
  lib/
    types.ts            — All TypeScript interfaces (Trade, DailyJournal, DropdownLibrary, UserRole, UserProfile, SharedTrade, TradeComment)
    services.ts         — All Firestore CRUD, admin operations, community services
    filters.ts          — Trade filtering logic (filterTrades function)
    firebase.ts         — Firebase app + auth initialization
    gdrive.ts           — Google Drive upload/delete/helpers
    utils.ts            — Utility functions (cn for class merging)
```

## Firestore Collections
| Collection | Document | Key Fields |
|-----------|----------|------------|
| `users/{uid}` | User profile | `role`, `banned`, `email`, `displayName`, `photoURL`, `createdAt` |
| `users/{uid}/trades/{tradeId}` | Trade | All Trade fields |
| `users/{uid}/dailyJournal/{id}` | Journal | mood, marketCondition, lessonsLearned, note |
| `users/{uid}/settings/dropdownLibrary` | Library | `pairs[]`, `emotions[]`, `platforms[]`, `timeframes[]` |
| `shared_trades/{token}` | Shared trade | SharedTrade fields (trade, privacy, ownerUid, public, likes, commentCount) |
| `shared_trades/{token}/likes/{userId}` | Like | `createdAt` |
| `shared_trades/{token}/comments/{id}` | Comment | userId, displayName, photoURL, text, createdAt |

## User Roles & Admin System
- **Roles**: `"admin"` | `"mod"` | `"user"` (stored in `users/{uid}.role`)
- **Super-admin**: Hardcoded UID `KffhYOBycQggcxA6ROXbed43Nav1` — always admin, cannot be demoted
- **Ban system**: `users/{uid}.banned = true/false` — banned users blocked from writing to community
- **Firestore rules** use helper functions: `isSuperAdmin()`, `hasRole()`, `isAdminOrMod()`, `isNotBanned()`
- Admin can change roles (admin/mod/user) and ban/unban any user (except super-admin)
- Mod can delete any user's comments in community

## Core Types
```typescript
type UserRole = "admin" | "mod" | "user";

interface Trade {
  id: string; date: string; pair: string; platform?: string;
  type: "BUY" | "SELL"; emotion: string;
  result: "WIN" | "LOSS" | "BREAKEVEN" | "CANCELLED"; status: "OPEN" | "CLOSED";
  pnl?: number; stopLoss?: string; takeProfit?: string;
  chartImageUrl?: string; exitChartImageUrl?: string;
  note?: string; entryPrice?: number; exitPrice?: number;
  lotSize?: number; timeframe?: string; entryTime?: string;
  closeDate?: string; closeTime?: string;
  exitReason?: string; lessonsLearned?: string;
  starred?: boolean; shareToken?: string; createdAt: number;
}

interface SharedTrade {
  trade: Omit<Trade, "id">; ownerUid: string; ownerDisplayName: string;
  ownerPhotoURL?: string; privacy: SharedTradePrivacy; createdAt: number;
  public?: boolean; likes?: number; commentCount?: number;
}
```

## Coding Conventions
- **Vietnamese UI** text throughout (labels, placeholders, toasts, error messages)
- **P&L**: always `toFixed(2)`, color green for positive, red for negative
- **Status icons**: `faPlay` (blue) = OPEN, `faFlagCheckered` (green) = CLOSED
- **Star icons**: `faStar` (solid, yellow) = starred, `faStarOutline` (regular, muted) = unstarred
- **Role icons**: `faCrown` (yellow) = Admin, `faUserShield` (blue) = Mod, `faUser` (muted) = User
- **NO emojis in rendered UI** — FontAwesome icons only
- **Responsive**: mobile-first, hide non-essential on mobile, show on sm/md/lg
- **Optimistic updates**: update local state first, persist to Firestore, rollback on error
- **stripUndefined()**: always use when writing to Firestore — Firestore rejects undefined fields
- **Error handling**: try/catch with console.error + user-facing toast message in Vietnamese
- **Toast**: `toast(message, "success"|"error"|"warning"|"info")` via `useToast()` hook
- **Loading states**: use `faSpinner` with `animate-spin` class
- **Confirm dangerous actions**: use `ConfirmDialog` component with appropriate variant
- **Draft autosave**: new trade form auto-saves to localStorage every 1s
- **Google Drive token**: expires after 1hr, refresh at 50min. Cached in sessionStorage

## Important Rules
- Use `user.uid` for all Firestore paths — never expose other users' data
- All Firestore writes go through `stripUndefined()`
- Use `parseISO` from date-fns for date strings
- Community comments are text-only (no images) to reduce Firestore load
- Share tokens are 12-char crypto-random strings
- `toggleLike()` uses Firestore `runTransaction` for atomic like/unlike
- After finishing any task, always confirm what user wants to do next via MCP feedback enhanced
