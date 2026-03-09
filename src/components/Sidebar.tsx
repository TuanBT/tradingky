"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faListCheck,
  faChartPie,
  faCalendarDays,
  faGear,
  faMoon,
  faSun,
  faBars,
  faXmark,
  faRightFromBracket,
  faShieldHalved,
  faBookOpen,
  faShield,
  faClipboardCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import { isAdmin } from "@/lib/services";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: faChartLine },
  {
    href: "/trades",
    label: "Quản lý lệnh",
    icon: faListCheck,
    children: [
      { href: "/trades", label: "Danh sách lệnh" },
      { href: "/review", label: "Xem lại lệnh" },
    ],
  },
  { href: "/statistics", label: "Thống kê", icon: faChartPie },
  { href: "/risk", label: "Quản lý rủi ro", icon: faShield },
  { href: "/checklist", label: "Checklist", icon: faClipboardCheck },
  { href: "/calendar", label: "Lịch", icon: faCalendarDays },
  { href: "/settings", label: "Cài đặt", icon: faGear },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-border">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="text-green-500" />
          TradingKý
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Nhật ký giao dịch</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.children
            ? pathname === item.href || pathname.startsWith("/trades/") || pathname === "/review"
            : pathname === item.href;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? item.children ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                {item.label}
              </Link>
              {item.children && isActive && (
                <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-border pl-3">
                  {item.children.map((child) => {
                    const childActive = child.href === "/trades"
                      ? pathname === "/trades" || pathname.startsWith("/trades/")
                      : pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "block px-2 py-1.5 rounded text-xs font-medium transition-colors",
                          childActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-accent-foreground"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {user && isAdmin(user.uid) && (
          <>
            <div className="pt-2 pb-1 px-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Admin</span>
            </div>
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === "/admin"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="w-6 h-6 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-xs text-muted-foreground truncate">
              {user.displayName || user.email}
            </span>
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-colors"
        >
          <FontAwesomeIcon
            icon={theme === "dark" ? faSun : faMoon}
            className="w-4 h-4"
          />
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-colors"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border"
      >
        <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-60 border-r border-border bg-card flex flex-col transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4"
        >
          <FontAwesomeIcon icon={faXmark} className="h-5 w-5 text-muted-foreground" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-60 border-r border-border bg-card flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
