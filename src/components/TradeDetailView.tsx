import { Trade, SharedTradePrivacy, getTradeImages } from "@/lib/types";
import { getImageSrc } from "@/lib/gdrive";
import { InfoRow } from "@/components/InfoRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@fortawesome/free-solid-svg-icons";
import { format, parseISO } from "date-fns";

/** Compute result display values from a Trade */
export function getResultDisplay(trade: Pick<Trade, "result">) {
  const resultLabel = trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : trade.result === "CANCELLED" ? "Hủy" : "Hoà";
  const resultColor = trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : trade.result === "CANCELLED" ? "text-gray-500" : "text-yellow-500";
  const resultBg = trade.result === "WIN" ? "bg-green-500/10 border-green-500/20" : trade.result === "LOSS" ? "bg-red-500/10 border-red-500/20" : trade.result === "CANCELLED" ? "bg-gray-500/10 border-gray-500/20" : "bg-yellow-500/10 border-yellow-500/20";
  return { resultLabel, resultColor, resultBg };
}

interface TradeDetailViewProps {
  trade: Omit<Trade, "id"> & { id?: string };
  /** Privacy settings for shared view — omit for owner view */
  privacy?: SharedTradePrivacy;
  /** Callback when chart image is clicked — receives all images and clicked index */
  onImageClick?: (images: string[], index: number) => void;
}

/**
 * Shared trade detail body: result banner, info cards, note, exit review, chart.
 * Used by trades/page.tsx and shared/[token]/page.tsx.
 * Does NOT include the header (pair + badges) or action buttons — those differ per page.
 */
export function TradeDetailView({ trade, privacy, onImageClick }: TradeDetailViewProps) {
  const isOpen = (trade.status || "CLOSED") === "OPEN";
  const { resultLabel, resultColor, resultBg } = getResultDisplay(trade);
  const hidePnl = privacy?.hidePnl ?? false;
  const hideLotSize = privacy?.hideLotSize ?? false;
  const hideEntryExitPrice = privacy?.hideEntryExitPrice ?? false;

  return (
    <>
      {/* Result Banner - only for CLOSED trades */}
      {!isOpen && (
        <div className={`rounded-lg border p-4 ${resultBg}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${resultColor}`}>{resultLabel}</span>
              {trade.emotion && <Badge variant="secondary">{trade.emotion}</Badge>}
            </div>
            {!hidePnl && trade.pnl !== undefined && (
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

      {/* Info cards grid */}
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
            {!hideEntryExitPrice && trade.entryPrice !== undefined && (
              <InfoRow icon={faArrowTrendUp} label="Giá vào" value={trade.entryPrice.toString()} mono />
            )}
            {trade.stopLoss && <InfoRow icon={faShieldHalved} label="Stop Loss" value={trade.stopLoss} />}
            {trade.takeProfit && <InfoRow icon={faBullseye} label="Take Profit" value={trade.takeProfit} />}
            {!hideLotSize && trade.lotSize !== undefined && (
              <InfoRow icon={faLayerGroup} label="Lot / Qty" value={trade.lotSize.toString()} mono />
            )}
            {!hidePnl && trade.pnl !== undefined && (
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
              Ghi chú
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Exit Review (only for CLOSED trades) */}
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

      {/* Chart Images */}
      {(() => {
        const images = getTradeImages(trade);
        if (images.length === 0) return null;
        const imageSrcs = images.map(getImageSrc);
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <FontAwesomeIcon icon={faImage} className="mr-2 h-4 w-4" />
                Ảnh chart {images.length > 1 && <span className="text-muted-foreground font-normal">({images.length})</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : images.length === 3 ? "grid-cols-1" : "grid-cols-2"}`}>
                {imageSrcs.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onImageClick?.(imageSrcs, i)}
                    className={images.length === 3 && i === 0 ? "col-span-1" : ""}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Chart ${i + 1}`}
                      loading="lazy"
                      className={`rounded-lg border w-full object-contain bg-muted cursor-pointer hover:opacity-90 transition-opacity ${images.length === 1 ? "max-h-[500px]" : "max-h-[300px]"}`}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </>
  );
}
