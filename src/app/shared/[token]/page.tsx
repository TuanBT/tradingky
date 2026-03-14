"use client";

import { useEffect, useState, use } from "react";
import { SharedTrade } from "@/lib/types";
import { getSharedTrade } from "@/lib/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageLightbox } from "@/components/ImageLightbox";
import { TradeDetailView } from "@/components/TradeDetailView";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faFlagCheckered,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export default function SharedTradePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [shared, setShared] = useState<SharedTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  useEffect(() => {
    getSharedTrade(token).then((data) => {
      if (data) {
        setShared(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !shared) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-4">
        <h1 className="text-2xl font-bold">Không tìm thấy lệnh</h1>
        <p className="text-muted-foreground">Link chia sẻ không tồn tại hoặc đã hết hạn.</p>
        <Button onClick={() => window.location.href = "/"}>
          <FontAwesomeIcon icon={faArrowRight} className="mr-2 h-4 w-4" />
          Về trang chủ Trading Ký
        </Button>
      </div>
    );
  }

  const { trade, ownerDisplayName, ownerPhotoURL, privacy } = shared;
  const isOpen = (trade.status || "CLOSED") === "OPEN";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-20 space-y-6">
        {/* Shared banner */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          {ownerPhotoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ownerPhotoURL} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{ownerDisplayName}</p>
            <p className="text-xs text-muted-foreground">đã chia sẻ lệnh này từ Trading Ký</p>
          </div>
        </div>

        {/* Trade header */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
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
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {format(parseISO(trade.date), "EEEE, dd MMMM yyyy", { locale: vi })}
          </p>
        </div>

        <TradeDetailView trade={trade} privacy={privacy} onImageClick={(src) => setLightboxSrc(src)} />

        {/* CTA */}
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">Ghi chép và chia sẻ giao dịch của bạn</p>
          <Button onClick={() => window.location.href = "/"} size="lg">
            Dùng Trading Ký miễn phí
            <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <ImageLightbox
        src={lightboxSrc}
        alt="Chart"
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc("")}
      />
    </div>
  );
}
