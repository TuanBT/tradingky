"use client";

import { useEffect, useState, use } from "react";
import { SharedTrade } from "@/lib/types";
import { getSharedTrade } from "@/lib/services";
import { getImageSrc } from "@/lib/gdrive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageLightbox } from "@/components/ImageLightbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faBuildingColumns,
  faArrowTrendUp,
  faBullseye,
  faShieldHalved,
  faClock,
  faLayerGroup,
  faNoteSticky,
  faFaceSmile,
  faDollarSign,
  faPlay,
  faFlagCheckered,
  faGraduationCap,
  faArrowRightFromBracket,
  faImage,
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
  const tradeStatus = trade.status || "CLOSED";
  const isOpen = tradeStatus === "OPEN";
  const resultLabel = trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : trade.result === "CANCELLED" ? "Hủy" : "Hoà";
  const resultColor = trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : trade.result === "CANCELLED" ? "text-gray-500" : "text-yellow-500";
  const resultBg = trade.result === "WIN" ? "bg-green-500/10 border-green-500/20" : trade.result === "LOSS" ? "bg-red-500/10 border-red-500/20" : trade.result === "CANCELLED" ? "bg-gray-500/10 border-gray-500/20" : "bg-yellow-500/10 border-yellow-500/20";



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

        {/* Result Banner */}
        {!isOpen && (
          <div className={`rounded-lg border p-4 ${resultBg}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${resultColor}`}>{resultLabel}</span>
                {trade.emotion && <Badge variant="secondary">{trade.emotion}</Badge>}
              </div>
              {!privacy.hidePnl && trade.pnl !== undefined && (
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Giá & Quản lý vốn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!privacy.hideEntryExitPrice && trade.entryPrice !== undefined && (
                <InfoRow icon={faArrowTrendUp} label="Giá vào" value={trade.entryPrice.toString()} mono />
              )}
              {trade.stopLoss && <InfoRow icon={faShieldHalved} label="Stop Loss" value={trade.stopLoss} />}
              {trade.takeProfit && <InfoRow icon={faBullseye} label="Take Profit" value={trade.takeProfit} />}
              {!privacy.hideLotSize && trade.lotSize !== undefined && (
                <InfoRow icon={faLayerGroup} label="Lot / Qty" value={trade.lotSize.toString()} mono />
              )}
              {!privacy.hidePnl && trade.pnl !== undefined && (
                <InfoRow
                  icon={faDollarSign}
                  label="P&L"
                  value={`${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`}
                  mono
                  valueColor={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {trade.note && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <FontAwesomeIcon icon={faNoteSticky} className="mr-2 h-4 w-4" />
                Ghi chú
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.note}</p>
            </CardContent>
          </Card>
        )}

        {!isOpen && (trade.exitReason || trade.lessonsLearned) && (
          <Card className="border-green-500/30">
            <CardHeader>
              <CardTitle className="text-base text-green-500">
                <FontAwesomeIcon icon={faFlagCheckered} className="mr-2 h-4 w-4" />
                Tổng kết
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
                    <span className="text-sm">Bài học</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.lessonsLearned}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

function InfoRow({
  icon,
  label,
  value,
  mono,
  valueColor,
}: {
  icon: typeof faCalendarDays;
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
