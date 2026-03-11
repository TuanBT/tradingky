"use client";

import { useState } from "react";
import { Trade, SharedTradePrivacy } from "@/lib/types";
import { shareTrade } from "@/lib/services";
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
  faUsers,
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
    hidePnl: false,
    hideLotSize: false,
    hideEntryExitPrice: false,
  });
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [publishToCommunity, setPublishToCommunity] = useState(false);

  const handleShare = async () => {
    if (!trade || !user) return;
    setSharing(true);
    try {
      const token = await shareTrade(
        trade,
        user.uid,
        user.displayName || "Ẩn danh",
        user.photoURL || undefined,
        privacy,
        publishToCommunity
      );
      const url = `${window.location.origin}/shared/${token}`;
      setShareUrl(url);
    } catch {
      toast("Không thể chia sẻ lệnh. Thử lại sau.", "error");
    }
    setSharing(false);
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
    setPublishToCommunity(false);
    setPrivacy({ hidePnl: false, hideLotSize: false, hideEntryExitPrice: false });
    onClose();
  };

  const togglePrivacy = (key: keyof SharedTradePrivacy) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!trade) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faShareNodes} className="h-4 w-4" />
            Chia sẻ lệnh
          </DialogTitle>
        </DialogHeader>

        {!shareUrl ? (
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
                <PrivacyToggle
                  label="Ẩn giá vào / giá ra"
                  checked={privacy.hideEntryExitPrice}
                  onChange={() => togglePrivacy("hideEntryExitPrice")}
                />
              </div>
            </div>

            {/* Publish to community */}
            <div className="rounded-lg border p-3 bg-muted/30">
              <PrivacyToggle
                label="Đăng lên trang Cộng đồng"
                checked={publishToCommunity}
                onChange={() => setPublishToCommunity(!publishToCommunity)}
              />
              {publishToCommunity && (
                <p className="text-xs text-muted-foreground mt-1 ml-12">
                  <FontAwesomeIcon icon={faUsers} className="mr-1 h-3 w-3" />
                  Lệnh sẽ hiện trên trang Cộng đồng cho mọi người xem
                </p>
              )}
            </div>

            <Button onClick={handleShare} disabled={sharing} className="w-full">
              {sharing ? (
                <><FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />Đang tạo link...</>
              ) : (
                <><FontAwesomeIcon icon={faShareNodes} className="mr-2 h-4 w-4" />Tạo link chia sẻ</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Link đã được tạo. Ai có link đều xem được.</p>
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
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Đóng
              </Button>
              <Button className="flex-1" onClick={handleCopy}>
                {copied ? "Đã copy!" : "Copy link"}
              </Button>
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
