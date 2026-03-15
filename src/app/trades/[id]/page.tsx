"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trade } from "@/lib/types";
import { getTrades, updateTrade, getSharedTrade, getUserSharedTradesMap } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPenToSquare,
  faPlay,
  faFlagCheckered,
  faStar,
  faShareNodes,
  faHeart,
  faComment,
} from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { TradeEditModal } from "@/components/TradeEditModal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ShareTradeDialog } from "@/components/ShareTradeDialog";
import { TradeDetailView } from "@/components/TradeDetailView";
import Link from "next/link";

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

  const isOpen = (trade.status || "CLOSED") === "OPEN";

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
            <Link
              href={`/shared/${trade.shareToken}`}
              target="_blank"
              className="flex items-center gap-2 ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Xem bài viết cộng đồng"
            >
              <FontAwesomeIcon icon={faShareNodes} className="h-3.5 w-3.5" />
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faHeart} className="h-3 w-3 text-pink-500" />
                {communityLikes}
              </span>
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faComment} className="h-3 w-3 text-blue-400" />
                {communityComments}
              </span>
            </Link>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {format(parseISO(trade.date), "EEEE, dd MMMM yyyy", { locale: vi })}
        </p>
      </div>

      <TradeDetailView trade={trade} onImageClick={(src) => setLightboxSrc(src)} />

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
