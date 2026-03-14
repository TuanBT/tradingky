"use client";

import { useState, useEffect, useCallback } from "react";
import { Trade, SharedTradePrivacy } from "@/lib/types";
import { shareTrade, updateTrade, getSharedTrade, updateSharedTrade } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShareNodes,
  faSpinner,
  faCopy,
  faCheck,
  faEyeSlash,
  faLink,
  faArrowsRotate,
} from "@fortawesome/free-solid-svg-icons";

interface ShareTradeDialogProps {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
}

export function ShareTradeDialog({ trade, open, onClose }: ShareTradeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [privacy, setPrivacy] = useState<SharedTradePrivacy>({
    hidePnl: true,
    hideLotSize: true,
    hideEntryExitPrice: false,
  });
  const [sharing, setSharing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // If trade already has a shareToken, load existing share URL
  const loadExisting = useCallback(async () => {
    if (!trade?.shareToken) return;
    setLoadingExisting(true);
    try {
      const existing = await getSharedTrade(trade.shareToken);
      if (existing) {
        setShareUrl(`${window.location.origin}/shared/${trade.shareToken}`);
        setPrivacy(existing.privacy);
      }
    } catch {
      // Ignore - will create new
    }
    setLoadingExisting(false);
  }, [trade?.shareToken]);

  useEffect(() => {
    if (open && trade?.shareToken) {
      loadExisting();
    }
  }, [open, trade?.shareToken, loadExisting]);

  const handleShare = async () => {
    if (!trade || !user) return;
    if ((trade.status || "CLOSED") === "OPEN") {
      toast("Chỉ có thể chia sẻ lệnh đã đóng", "error");
      return;
    }
    setSharing(true);
    try {
      const token = await shareTrade(
        trade,
        user.uid,
        user.displayName || "Ẩn danh",
        user.photoURL || undefined,
        privacy,
        true // always public
      );
      await updateTrade(user.uid, trade.id, { shareToken: token });
      const url = `${window.location.origin}/shared/${token}`;
      setShareUrl(url);
      // Auto-copy
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast("Đã tạo link và copy vào clipboard", "success");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast("Đã tạo link chia sẻ", "success");
      }
    } catch (err) {
      console.error("ShareTradeDialog handleShare error:", err);
      toast((err as Error).message || "Không thể chia sẻ lệnh. Thử lại sau.", "error");
    }
    setSharing(false);
  };

  const handleUpdate = async () => {
    if (!trade || !user || !trade.shareToken) return;
    setUpdating(true);
    try {
      await updateSharedTrade(trade.shareToken, trade, user.uid, privacy);
      toast("Đã cập nhật bài chia sẻ", "success");
    } catch (err) {
      toast((err as Error).message || "Không thể cập nhật", "error");
    }
    setUpdating(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Đã copy link", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Không thể copy. Hãy copy thủ công.", "error");
    }
  };

  const handleClose = () => {
    setShareUrl("");
    setCopied(false);
    setPrivacy({ hidePnl: true, hideLotSize: true, hideEntryExitPrice: false });
    onClose();
  };

  const togglePrivacy = (key: keyof SharedTradePrivacy) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!trade) return null;

  const alreadyShared = !!trade.shareToken && !!shareUrl;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faShareNodes} className="h-4 w-4" />
            Chia sẻ lệnh
          </DialogTitle>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-8">
            <FontAwesomeIcon icon={faSpinner} className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Trade summary */}
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{trade.pair} · {trade.type}</span>
                <span className={`text-sm font-mono ${trade.pnl !== undefined ? (trade.pnl >= 0 ? "text-green-500" : "text-red-500") : "text-muted-foreground"}`}>
                  {trade.pnl !== undefined ? `${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}` : "-"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{trade.date} · {trade.emotion}</p>
            </div>

            {/* Privacy options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FontAwesomeIcon icon={faEyeSlash} className="h-3.5 w-3.5 text-muted-foreground" />
                Ẩn thông tin nhạy cảm
              </Label>
              <div className="space-y-2">
                <PrivacyToggle
                  label="Ẩn P&L (Lợi nhuận)"
                  checked={privacy.hidePnl}
                  onChange={() => togglePrivacy("hidePnl")}
                />
                <PrivacyToggle
                  label="Ẩn Lot Size / Khối lượng"
                  checked={privacy.hideLotSize}
                  onChange={() => togglePrivacy("hideLotSize")}
                />
              </div>
            </div>

            {/* Link display (if already shared) */}
            {shareUrl && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <FontAwesomeIcon icon={faLink} className="mr-1" />
                  Lệnh đã được đăng lên Cộng đồng. Ai có link đều xem được.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Đóng
              </Button>
              {!alreadyShared ? (
                <Button onClick={handleShare} disabled={sharing} className="flex-1">
                  {sharing ? (
                    <><FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />Đang tạo...</>
                  ) : (
                    <><FontAwesomeIcon icon={faShareNodes} className="mr-2 h-4 w-4" />Tạo link & đăng</>
                  )}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleUpdate} disabled={updating} className="flex-1">
                    {updating ? (
                      <><FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />Đang cập nhật...</>
                    ) : (
                      <><FontAwesomeIcon icon={faArrowsRotate} className="mr-2 h-4 w-4" />Cập nhật</>
                    )}
                  </Button>
                  <Button className="flex-1" onClick={handleCopy}>
                    <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="mr-2 h-4 w-4" />
                    {copied ? "Đã copy!" : "Copy link"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PrivacyToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-accent/50 transition-colors">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm">{label}</span>
    </label>
  );
}
