"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trade } from "@/lib/types";
import { getTrades, updateTrade, getSharedTrade, getUserSharedTradesMap } from "@/lib/services";
import { getImageSrc } from "@/lib/gdrive";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPenToSquare,
  faCalendarDays,
  faBuildingColumns,
  faArrowTrendUp,
  faArrowTrendDown,
  faBullseye,
  faShieldHalved,
  faClock,
  faLayerGroup,
  faImage,
  faNoteSticky,
  faFaceSmile,
  faDollarSign,
  faPlay,
  faFlagCheckered,
  faGraduationCap,
  faArrowRightFromBracket,
  faStar,
  faShareNodes,
  faHeart,
  faComment,
} from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import { TradeEditModal } from "@/components/TradeEditModal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ShareTradeDialog } from "@/components/ShareTradeDialog";

export default function TradeDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tradeId = params.id as string;

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"edit" | "close">("edit");
  const [lightboxSrc, setLightboxSrc] = useState<string>("");
  const [shareOpen, setShareOpen] = useState(false);
  const [communityLikes, setCommunityLikes] = useState<number | null>(null);
  const [communityComments, setCommunityComments] = useState<number | null>(null);

  const toggleStar = async () => {
    if (!user || !trade) return;
    const newStarred = !trade.starred;
    setTrade((prev) => prev ? { ...prev, starred: newStarred } : prev);
    try {
      await updateTrade(user.uid, trade.id, { starred: newStarred });
    } catch {
      setTrade((prev) => prev ? { ...prev, starred: !newStarred } : prev);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    const trades = await getTrades(user.uid);
    const found = trades.find((t) => t.id === tradeId);
    setTrade(found || null);
    // Fetch community stats if shared
    if (found) {
      const fetchStats = async () => {
        if (found.shareToken) {
          const shared = await getSharedTrade(found.shareToken);
          if (shared) {
            setCommunityLikes(shared.likes || 0);
            setCommunityComments(shared.commentCount || 0);
          }
        } else {
          // Back-fill: look up shared_trades by ownerUid and match by createdAt
          const sharedMap = await getUserSharedTradesMap(user!.uid);
          const match = sharedMap[found.createdAt];
          if (match) {
            found.shareToken = match.token;
            setTrade({ ...found });
            setCommunityLikes(match.likes);
            setCommunityComments(match.commentCount);
            await updateTrade(user!.uid, found.id, { shareToken: match.token });
          }
        }
      };
      fetchStats().catch(() => {});
    }
    setLoading(false);
  }, [user, tradeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Không tìm thấy lệnh này.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  const resultLabel = trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : trade.result === "CANCELLED" ? "Hủy" : "Hoà";
  const resultColor = trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : trade.result === "CANCELLED" ? "text-gray-500" : "text-yellow-500";
  const resultBg = trade.result === "WIN" ? "bg-green-500/10 border-green-500/20" : trade.result === "LOSS" ? "bg-red-500/10 border-red-500/20" : trade.result === "CANCELLED" ? "bg-gray-500/10 border-gray-500/20" : "bg-yellow-500/10 border-yellow-500/20";
  const tradeStatus = trade.status || "CLOSED";
  const isOpen = tradeStatus === "OPEN";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} disabled={isOpen} title={isOpen ? "Chỉ có thể chia sẻ lệnh đã đóng" : "Chia sẻ"}>
            <FontAwesomeIcon icon={faShareNodes} className="mr-2 h-3.5 w-3.5" />
            Chia sẻ
          </Button>
          {isOpen && (
            <Button variant="outline" size="sm" className="text-amber-600 border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-700" onClick={() => { setEditMode("close"); setEditOpen(true); }}>
              <FontAwesomeIcon icon={faFlagCheckered} className="mr-2 h-3.5 w-3.5" />
              Đóng lệnh
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setEditMode("edit"); setEditOpen(true); }}>
            <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-3.5 w-3.5" />
            Sửa lệnh
          </Button>
        </div>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={toggleStar} className="cursor-pointer hover:scale-125 transition-transform">
            <FontAwesomeIcon icon={trade.starred ? faStar : faStarOutline} className={`h-5 w-5 ${trade.starred ? "text-yellow-500" : "text-muted-foreground/40 hover:text-yellow-400"}`} />
          </button>
          <h1 className="text-2xl font-bold">{trade.pair}</h1>
          <Badge className={trade.type === "BUY" ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"}>
            {trade.type}
          </Badge>
          {isOpen ? (
            <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">
              <FontAwesomeIcon icon={faPlay} className="mr-1 h-3 w-3" />
              Đang chạy
            </Badge>
          ) : (
            <Badge className="bg-green-500/15 text-green-500 border-green-500/30">
              <FontAwesomeIcon icon={faFlagCheckered} className="mr-1 h-3 w-3" />
              Đã đóng
            </Badge>
          )}
          {trade.shareToken && communityLikes !== null && (
            <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
              <FontAwesomeIcon icon={faShareNodes} className="h-3.5 w-3.5" />
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faHeart} className="h-3 w-3 text-pink-500" />
                {communityLikes}
              </span>
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faComment} className="h-3 w-3 text-blue-400" />
                {communityComments}
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {format(parseISO(trade.date), "EEEE, dd MMMM yyyy", { locale: vi })}
        </p>
      </div>

      {/* Result Banner - only for CLOSED trades */}
      {!isOpen && (
      <div className={`rounded-lg border p-4 ${resultBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${resultColor}`}>{resultLabel}</span>
            {trade.emotion && <Badge variant="secondary">{trade.emotion}</Badge>}
          </div>
          {trade.pnl !== undefined && (
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">P&L</span>
              <span className={`text-3xl font-mono font-bold ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* OPEN trade banner */}
      {isOpen && (
        <div className="rounded-lg border p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faPlay} className="h-5 w-5 text-blue-500 animate-pulse" />
            <span className="text-lg font-semibold text-blue-500">Đang chạy</span>
            {trade.emotion && <Badge variant="secondary">{trade.emotion}</Badge>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trade Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin lệnh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={faCalendarDays} label="Ngày vào" value={`${format(parseISO(trade.date), "dd/MM/yyyy")}${trade.entryTime ? " lúc " + trade.entryTime : ""}`} />
            {trade.closeDate && (
              <InfoRow icon={faCalendarDays} label="Ngày đóng" value={`${format(parseISO(trade.closeDate), "dd/MM/yyyy")}${trade.closeTime ? " lúc " + trade.closeTime : ""}`} />
            )}
            {trade.platform && <InfoRow icon={faBuildingColumns} label="Sàn" value={trade.platform} />}
            <InfoRow icon={faFaceSmile} label="Tâm lý" value={trade.emotion} />
            {trade.timeframe && <InfoRow icon={faClock} label="Timeframe" value={trade.timeframe} />}
          </CardContent>
        </Card>

        {/* Price Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Giá & Quản lý vốn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trade.entryPrice !== undefined && (
              <InfoRow icon={faArrowTrendUp} label="Giá vào" value={trade.entryPrice.toString()} mono />
            )}
            {trade.stopLoss && <InfoRow icon={faShieldHalved} label="Stop Loss" value={trade.stopLoss} />}
            {trade.takeProfit && <InfoRow icon={faBullseye} label="Take Profit" value={trade.takeProfit} />}
            {trade.lotSize !== undefined && (
              <InfoRow icon={faLayerGroup} label="Lot / Qty" value={trade.lotSize.toString()} mono />
            )}
            {trade.pnl !== undefined && (
              <InfoRow
                icon={faDollarSign}
                label="P&L"
                value={`${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`}
                mono
                valueColor={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}
              />
            )}
            {!trade.entryPrice && !trade.stopLoss && !trade.takeProfit && !trade.lotSize && trade.pnl === undefined && (
              <p className="text-sm text-muted-foreground">Chưa có thông tin giá.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Note */}
      {trade.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <FontAwesomeIcon icon={faNoteSticky} className="mr-2 h-4 w-4" />
              Ghi chú lúc vào lệnh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Phase 2 - Exit Review (only for CLOSED trades) */}
      {!isOpen && (trade.exitReason || trade.lessonsLearned) && (
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="text-base text-green-500">
              <FontAwesomeIcon icon={faFlagCheckered} className="mr-2 h-4 w-4" />
              Tổng kết sau đóng lệnh
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trade.exitReason && (
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-3.5 w-3.5" />
                  <span className="text-sm">Lý do thoát lệnh</span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.exitReason}</p>
              </div>
            )}
            {trade.lessonsLearned && (
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FontAwesomeIcon icon={faGraduationCap} className="h-3.5 w-3.5" />
                  <span className="text-sm">Bài học & Kinh nghiệm</span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.lessonsLearned}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart Image */}
      {trade.chartImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <FontAwesomeIcon icon={faImage} className="mr-2 h-4 w-4" />
              Ảnh chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button type="button" onClick={() => setLightboxSrc(getImageSrc(trade.chartImageUrl!))}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageSrc(trade.chartImageUrl)}
                alt="Chart"
                className="rounded-lg border w-full object-contain max-h-[500px] bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              />
            </button>
          </CardContent>
        </Card>
      )}

      <TradeEditModal
        tradeId={trade.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={loadData}
        mode={editMode}
      />

      <ImageLightbox
        src={lightboxSrc}
        alt="Chart"
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc("")}
      />

      <ShareTradeDialog
        trade={trade}
        open={shareOpen}
        onClose={() => { setShareOpen(false); loadData(); }}
      />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
  valueColor,
}: {
  icon: typeof faArrowLeft;
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""} ${valueColor || ""}`}>
        {value}
      </span>
    </div>
  );
}
