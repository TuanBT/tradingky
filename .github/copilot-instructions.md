# Trading Ký — Copilot Instructions

## Project Overview
Trading Ký is a Vietnamese trading journal PWA built with **Next.js 16** (Turbopack), **Firebase Firestore**, **Google Drive REST API** for image storage, **Tailwind CSS**, and **FontAwesome** icons (solid + regular).

Production: https://tradingky.buitientuan.com/ (Vercel)
Firebase project: `tradingky-tuan`

## Tech Stack
- **Framework**: Next.js 16.1.6 with App Router, `"use client"` components
- **Database**: Firebase Firestore — collections: `users/{uid}/trades`, `users/{uid}/settings`
- **Auth**: Firebase Auth with Google Sign-In (`signInWithPopup` + `signInWithRedirect` fallback)
- **Image Storage**: Google Drive REST API via `drive.file` scope, tokens cached in sessionStorage (50min)
- **Styling**: Tailwind CSS with responsive breakpoints: sm(640), md(768), lg(1024)
- **Icons**: FontAwesome — `@fortawesome/free-solid-svg-icons` and `@fortawesome/free-regular-svg-icons`. NO emojis in UI — use FontAwesome icons instead.
- **UI Components**: shadcn/ui in `src/components/ui/`
- **Date**: date-fns with `vi` locale

## Key Architecture Patterns
- **Optimistic updates**: Update local state immediately, call Firestore, rollback on error
- **EditableSelect**: Custom dropdown allowing add/edit/delete of items inline (used for pairs, emotions, platforms, timeframes)
- **DropdownLibrary**: Settings stored per-user in Firestore `users/{uid}/settings/library` with keys: `pairs`, `emotions`, `platforms`, `timeframes`
- **TradeFilterContext**: Global filter state for trades (search, emotion, status, dateRange, starred)
- **Draft autosave**: New trade drafts saved to localStorage every 1s

## File Structure
- `src/app/` — Pages (trades, calendar, statistics, review, checklist, settings, admin)
- `src/components/` — Shared components (TradeEditModal, TradeFilterBar, EditableSelect, etc.)
- `src/lib/types.ts` — Core types (Trade, DailyJournal, DropdownLibrary)
- `src/lib/services.ts` — Firestore CRUD operations
- `src/lib/filters.ts` — Trade filtering logic
- `public/manifest.json` — PWA manifest

## Trade Type
```typescript
interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  pair: string;
  platform?: string;
  type: "BUY" | "SELL";
  emotion: string; // From DropdownLibrary, includes emoji prefix
  result: "WIN" | "LOSS" | "BREAKEVEN";
  status: "OPEN" | "CLOSED";
  pnl?: number;
  stopLoss?: string;
  takeProfit?: string;
  chartImageUrl?: string;
  note?: string;
  entryPrice?: number;
  exitPrice?: number;
  lotSize?: number;
  timeframe?: string;
  closeDate?: string;
  exitReason?: string;
  lessonsLearned?: string;
  exitChartImageUrl?: string;
  starred?: boolean;
  createdAt: number;
}
```

## Coding Conventions
- Vietnamese UI text throughout (labels, placeholders, toasts)
- P&L always formatted to 2 decimal places: `toFixed(2)`
- Use `parseISO` from date-fns for date strings
- Status icons: `faPlay` (blue) for OPEN, `faFlagCheckered` (green) for CLOSED
- Star icons: `faStar` (solid, yellow) for starred, `faStarOutline` (regular, muted) for unstarred
- Always use FontAwesome icons, never raw emojis in the rendered UI
- Responsive: hide non-essential columns on mobile, show on sm/md/lg

## Important Notes
- Google Drive access token expires after 1 hour (Google limit). We refresh at 50min.
- Always use `stripUndefined()` when writing to Firestore to avoid setting undefined fields
- Use `user.uid` for all Firestore paths — never expose other users' data
- The app should remain portrait-locked on mobile (PWA manifest: `"orientation": "portrait"`)
- After finishing a task, always confirm what user wants to do next via MCP feedback enhanced
