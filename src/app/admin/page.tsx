"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  isAdmin,
  getRegisteredUsers,
  resetUserTrades,
  resetUserAll,
  createSmokeTestTrades,
  UserInfo,
} from "@/lib/services";
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
} from "@fortawesome/free-solid-svg-icons";

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ time: string; message: string; type: "info" | "success" | "error" }[]>([]);

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
    if (!confirm(`Xoá TẤT CẢ trades của user ${uid.slice(0, 8)}...? Hành động này không thể hoàn tác!`)) return;
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
    if (!confirm(`⚠️ RESET TOÀN BỘ DATA của user ${uid.slice(0, 8)}...?\n\nSẽ xoá: tất cả trades, journals, và reset dropdown library.\nHành động này KHÔNG THỂ hoàn tác!`)) return;
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
              <span className="text-2xl opacity-50">💰</span>
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
              <span className="text-2xl opacity-50">🟢</span>
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
                  <TableHead>UID</TableHead>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Chưa có user nào trong hệ thống
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.uid}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {u.uid.slice(0, 12)}...
                          </code>
                          {isAdmin(u.uid) && (
                            <Badge variant="outline" className="text-xs border-primary text-primary">
                              Admin
                            </Badge>
                          )}
                        </div>
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
                        <div className="flex justify-end gap-1">
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
                            onClick={() => handleResetTrades(u.uid)}
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
                            onClick={() => handleResetAll(u.uid)}
                            disabled={actionLoading !== null}
                            title="⚠️ Reset toàn bộ data"
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
                  ))
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
              <Button variant="outline" size="sm" disabled>
                <FontAwesomeIcon icon={faFlask} className="h-3 w-3" />
              </Button>
              <span><strong>Smoke Test</strong> — Tạo 5 trades test (tag: smoke-test)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="text-orange-500">
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
              </Button>
              <span><strong>Xoá Trades</strong> — Xoá tất cả trades của user</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="text-red-500">
                <FontAwesomeIcon icon={faBroom} className="h-3 w-3" />
              </Button>
              <span><strong>Reset All</strong> — Xoá trades, journals, reset library</span>
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
    </div>
  );
}
