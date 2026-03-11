"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  isAdmin,
  getRegisteredUsers,
  resetUserTrades,
  resetUserAll,
  createSmokeTestTrades,
  setUserRole,
  setUserBanned,
  UserInfo,
} from "@/lib/services";
import type { UserRole } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faUsers,
  faTrash,
  faFlask,
  faRotate,
  faTriangleExclamation,
  faCheck,
  faSpinner,
  faBroom,
  faServer,
  faDollarSign,
  faCircle,
  faExclamationTriangle,
  faCrown,
  faUserShield,
  faUser,
  faBan,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ time: string; message: string; type: "info" | "success" | "error" }[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ type: "reset-trades" | "reset-all" | "change-role" | "toggle-ban"; uid: string; extra?: string } | null>(null);

  const roleConfig: Record<UserRole, { label: string; icon: typeof faCrown; color: string; badgeClass: string }> = {
    admin: { label: "Admin", icon: faCrown, color: "text-yellow-500", badgeClass: "border-yellow-500 text-yellow-500" },
    mod: { label: "Mod", icon: faUserShield, color: "text-blue-500", badgeClass: "border-blue-500 text-blue-500" },
    user: { label: "User", icon: faUser, color: "text-muted-foreground", badgeClass: "border-muted text-muted-foreground" },
  };

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    const time = new Date().toLocaleTimeString("vi-VN");
    setLogs((prev) => [{ time, message, type }, ...prev]);
  };

  const loadUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getRegisteredUsers();
      setUsers(data);
      addLog(`Đã tải ${data.length} user(s)`, "success");
    } catch (err) {
      addLog(`Lỗi tải users: ${err}`, "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin(user.uid)) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user || !isAdmin(user.uid)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <FontAwesomeIcon icon={faShieldHalved} className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  const handleResetTrades = async (uid: string) => {
    setActionLoading(`reset-trades-${uid}`);
    try {
      const count = await resetUserTrades(uid);
      addLog(`Đã xoá ${count} trades của user ${uid.slice(0, 8)}...`, "success");
      await loadUsers();
    } catch (err) {
      addLog(`Lỗi reset trades: ${err}`, "error");
    }
    setActionLoading(null);
  };

  const handleResetAll = async (uid: string) => {
    setActionLoading(`reset-all-${uid}`);
    try {
      const result = await resetUserAll(uid);
      addLog(`Reset hoàn tất: ${result.trades} trades, ${result.journals} journals, library reset`, "success");
      await loadUsers();
    } catch (err) {
      addLog(`Lỗi reset all: ${err}`, "error");
    }
    setActionLoading(null);
  };

  const handleSmokeTest = async (uid: string) => {
    setActionLoading(`smoke-${uid}`);
    try {
      const count = await createSmokeTestTrades(uid);
      addLog(`Smoke test: tạo ${count} trades cho user ${uid.slice(0, 8)}...`, "success");
      await loadUsers();
    } catch (err) {
      addLog(`Lỗi smoke test: ${err}`, "error");
    }
    setActionLoading(null);
  };

  const handleChangeRole = async (uid: string, newRole: UserRole) => {
    setActionLoading(`role-${uid}`);
    try {
      await setUserRole(uid, newRole);
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u));
      addLog(`Đã đổi role user ${uid.slice(0, 8)}... → ${roleConfig[newRole].label}`, "success");
    } catch (err) {
      addLog(`Lỗi đổi role: ${err}`, "error");
    }
    setActionLoading(null);
  };

  const handleToggleBan = async (uid: string, currentBanned: boolean) => {
    setActionLoading(`ban-${uid}`);
    try {
      await setUserBanned(uid, !currentBanned);
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, banned: !currentBanned } : u));
      addLog(`User ${uid.slice(0, 8)}... đã ${!currentBanned ? "bị chặn" : "được mở chặn"}`, "success");
    } catch (err) {
      addLog(`Lỗi toggle ban: ${err}`, "error");
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faShieldHalved} className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý users và dữ liệu hệ thống
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadUsers} disabled={loading}>
          <FontAwesomeIcon icon={faRotate} className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <FontAwesomeIcon icon={faUsers} className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng Trades</p>
                <p className="text-2xl font-bold">{users.reduce((s, u) => s + u.tradeCount, 0)}</p>
              </div>
              <FontAwesomeIcon icon={faServer} className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng P&L</p>
                <p className={`text-2xl font-bold font-mono ${users.reduce((s, u) => s + u.totalPnl, 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${users.reduce((s, u) => s + u.totalPnl, 0).toFixed(2)}
                </p>
              </div>
              <FontAwesomeIcon icon={faDollarSign} className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{users.filter((u) => u.tradeCount > 0).length}</p>
              </div>
              <FontAwesomeIcon icon={faCircle} className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
            Danh sách Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Trades</TableHead>
                  <TableHead className="text-center">Win Rate</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead>Lệnh cuối</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chưa có user nào trong hệ thống
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const rc = roleConfig[u.role];
                    const isSuperAdmin = isAdmin(u.uid);
                    return (
                    <TableRow key={u.uid} className={u.banned ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {u.photoURL && (
                            <img src={u.photoURL} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate max-w-[120px]">
                                {u.displayName || u.uid.slice(0, 8) + "..."}
                              </span>
                              {u.banned && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                  <FontAwesomeIcon icon={faBan} className="h-2.5 w-2.5 mr-0.5" />
                                  Chặn
                                </Badge>
                              )}
                            </div>
                            <code className="text-[10px] text-muted-foreground">
                              {u.uid.slice(0, 10)}...
                            </code>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${rc.badgeClass}`}>
                          <FontAwesomeIcon icon={rc.icon} className="h-3 w-3 mr-1" />
                          {rc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">{u.tradeCount}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono ${u.winRate >= 50 ? "text-green-500" : u.winRate > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          {u.tradeCount > 0 ? `${u.winRate.toFixed(1)}%` : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono ${u.totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {u.tradeCount > 0 ? `${u.totalPnl >= 0 ? "+" : ""}$${u.totalPnl.toFixed(2)}` : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.lastTradeDate || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {/* Role buttons — only show for non-super-admin */}
                          {!isSuperAdmin && (
                            <>
                              {(["admin", "mod", "user"] as UserRole[]).filter(r => r !== u.role).map((newRole) => (
                                <Button
                                  key={newRole}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirmAction({ type: "change-role", uid: u.uid, extra: newRole })}
                                  disabled={actionLoading !== null}
                                  title={`Đổi role → ${roleConfig[newRole].label}`}
                                  className={roleConfig[newRole].color}
                                >
                                  {actionLoading === `role-${u.uid}` ? (
                                    <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <FontAwesomeIcon icon={roleConfig[newRole].icon} className="h-3 w-3" />
                                  )}
                                </Button>
                              ))}
                              <Separator orientation="vertical" className="h-6 mx-0.5" />
                              {/* Ban/Unban */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmAction({ type: "toggle-ban", uid: u.uid })}
                                disabled={actionLoading !== null}
                                title={u.banned ? "Mở chặn user" : "Chặn user"}
                                className={u.banned ? "text-green-500 hover:text-green-600" : "text-red-500 hover:text-red-600"}
                              >
                                {actionLoading === `ban-${u.uid}` ? (
                                  <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={u.banned ? faCheckCircle : faBan} className="h-3 w-3" />
                                )}
                              </Button>
                              <Separator orientation="vertical" className="h-6 mx-0.5" />
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSmokeTest(u.uid)}
                            disabled={actionLoading !== null}
                            title="Smoke Test - tạo 5 trades test"
                          >
                            {actionLoading === `smoke-${u.uid}` ? (
                              <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
                            ) : (
                              <FontAwesomeIcon icon={faFlask} className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmAction({ type: "reset-trades", uid: u.uid })}
                            disabled={actionLoading !== null}
                            title="Xoá tất cả trades"
                            className="text-orange-500 hover:text-orange-600"
                          >
                            {actionLoading === `reset-trades-${u.uid}` ? (
                              <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
                            ) : (
                              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmAction({ type: "reset-all", uid: u.uid })}
                            disabled={actionLoading !== null}
                            title="Reset toàn bộ data"
                            className="text-red-500 hover:text-red-600"
                          >
                            {actionLoading === `reset-all-${u.uid}` ? (
                              <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
                            ) : (
                              <FontAwesomeIcon icon={faBroom} className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chú thích thao tác</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCrown} className="h-3 w-3 text-yellow-500" />
              <span><strong>Admin</strong> — Đổi role thành Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faUserShield} className="h-3 w-3 text-blue-500" />
              <span><strong>Mod</strong> — Đổi role thành Moderator</span>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="h-3 w-3 text-muted-foreground" />
              <span><strong>User</strong> — Đổi role thành User thường</span>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBan} className="h-3 w-3 text-red-500" />
              <span><strong>Chặn/Mở chặn</strong> — Ban hoặc unban user</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <FontAwesomeIcon icon={faFlask} className="h-3 w-3" />
              </Button>
              <span><strong>Smoke Test</strong> — Tạo 5 trades test</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="text-orange-500">
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
              </Button>
              <span><strong>Xoá Trades</strong> — Xoá tất cả trades</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="text-red-500">
                <FontAwesomeIcon icon={faBroom} className="h-3 w-3" />
              </Button>
              <span><strong>Reset All</strong> — Xoá toàn bộ data</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Activity Log</CardTitle>
          {logs.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
              Xoá log
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-xs text-muted-foreground font-mono shrink-0">{log.time}</span>
                  <FontAwesomeIcon
                    icon={log.type === "success" ? faCheck : log.type === "error" ? faTriangleExclamation : faServer}
                    className={`h-3 w-3 mt-0.5 shrink-0 ${
                      log.type === "success" ? "text-green-500" : log.type === "error" ? "text-red-500" : "text-blue-500"
                    }`}
                  />
                  <span className={log.type === "error" ? "text-red-500" : ""}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.type === "reset-trades") handleResetTrades(confirmAction.uid);
          if (confirmAction?.type === "reset-all") handleResetAll(confirmAction.uid);
          if (confirmAction?.type === "change-role") handleChangeRole(confirmAction.uid, confirmAction.extra as UserRole);
          if (confirmAction?.type === "toggle-ban") {
            const targetUser = users.find((u) => u.uid === confirmAction.uid);
            if (targetUser) handleToggleBan(confirmAction.uid, targetUser.banned);
          }
        }}
        title={
          confirmAction?.type === "reset-all"
            ? <><FontAwesomeIcon icon={faExclamationTriangle} className="mr-1 h-4 w-4 text-yellow-500" />Reset toàn bộ</>
            : confirmAction?.type === "change-role"
            ? `Đổi role`
            : confirmAction?.type === "toggle-ban"
            ? (users.find((u) => u.uid === confirmAction?.uid)?.banned ? "Mở chặn user" : "Chặn user")
            : "Xoá trades"
        }
        message={
          confirmAction?.type === "reset-all"
            ? `Reset TOÀN BỘ DATA của user ${confirmAction?.uid.slice(0, 8)}...? Sẽ xoá tất cả trades, journals, và reset dropdown library. Hành động KHÔNG THỂ hoàn tác!`
            : confirmAction?.type === "change-role"
            ? `Đổi role của user ${confirmAction?.uid.slice(0, 8)}... thành ${roleConfig[confirmAction?.extra as UserRole]?.label}?`
            : confirmAction?.type === "toggle-ban"
            ? (users.find((u) => u.uid === confirmAction?.uid)?.banned
                ? `Mở chặn user ${confirmAction?.uid.slice(0, 8)}...? User sẽ có thể sử dụng app trở lại.`
                : `Chặn user ${confirmAction?.uid.slice(0, 8)}...? User sẽ không thể truy cập app.`)
            : `Xoá TẤT CẢ trades của user ${confirmAction?.uid.slice(0, 8)}...? Hành động không thể hoàn tác!`
        }
        confirmText={
          confirmAction?.type === "reset-all" ? "Reset toàn bộ"
            : confirmAction?.type === "change-role" ? "Đổi role"
            : confirmAction?.type === "toggle-ban"
            ? (users.find((u) => u.uid === confirmAction?.uid)?.banned ? "Mở chặn" : "Chặn")
            : "Xoá trades"
        }
        variant={confirmAction?.type === "toggle-ban" && !users.find((u) => u.uid === confirmAction?.uid)?.banned ? "danger" : confirmAction?.type === "reset-all" || confirmAction?.type === "reset-trades" ? "danger" : "default"}
      />
    </div>
  );
}
