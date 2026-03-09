"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trade } from "@/lib/types";
import { getTrades } from "@/lib/services";
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
  faChartLine,
  faBuildingColumns,
  faArrowTrendUp,
  faArrowTrendDown,
  faBullseye,
  faShieldHalved,
  faLightbulb,
  faClock,
  faLayerGroup,
  faTags,
  faImage,
  faNoteSticky,
  faFaceSmile,
  faDollarSign,
} from "@fortawesome/free-solid-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

export default function TradeDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tradeId = params.id as string;

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const trades = await getTrades(user.uid);
      const found = trades.find((t) => t.id === tradeId);
      setTrade(found || null);
      setLoading(false);
    }
    load();
  }, [user, tradeId]);

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
        <Link href="/trades">
          <Button variant="outline">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </Link>
      </div>
    );
  }

  const resultLabel = trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : "Hoà";
  const resultColor = trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : "text-yellow-500";
  const resultBg = trade.result === "WIN" ? "bg-green-500/10 border-green-500/20" : trade.result === "LOSS" ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/10 border-yellow-500/20";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/trades">
            <Button variant="ghost" size="icon">
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{trade.pair}</h1>
              <Badge
                className={trade.type === "BUY" ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"}
              >
                {trade.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(parseISO(trade.date), "EEEE, dd MMMM yyyy", { locale: vi })}
            </p>
          </div>
        </div>
        <Link href={`/trades/new?edit=${trade.id}`}>
          <Button variant="outline">
            <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-4 w-4" />
            Sửa lệnh
          </Button>
        </Link>
      </div>

      {/* Result Banner */}
      <div className={`rounded-lg border p-4 ${resultBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${resultColor}`}>{resultLabel}</span>
            <Badge variant="outline">{trade.platform}</Badge>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trade Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin lệnh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={faCalendarDays} label="Ngày vào" value={format(parseISO(trade.date), "dd/MM/yyyy")} />
            {trade.closeDate && (
              <InfoRow icon={faCalendarDays} label="Ngày đóng" value={format(parseISO(trade.closeDate), "dd/MM/yyyy")} />
            )}
            <InfoRow icon={faBuildingColumns} label="Sàn" value={trade.platform} />
            <InfoRow icon={faFaceSmile} label="Tâm lý" value={trade.emotion} />
            {trade.reason && <InfoRow icon={faLightbulb} label="Lý do vào lệnh" value={trade.reason} />}
            {trade.strategy && <InfoRow icon={faChartLine} label="Strategy" value={trade.strategy} />}
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
            {trade.exitPrice !== undefined && (
              <InfoRow icon={faArrowTrendDown} label="Giá ra" value={trade.exitPrice.toString()} mono />
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
            {!trade.entryPrice && !trade.exitPrice && !trade.stopLoss && !trade.takeProfit && !trade.lotSize && trade.pnl === undefined && (
              <p className="text-sm text-muted-foreground">Chưa có thông tin giá.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {trade.tags && trade.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <FontAwesomeIcon icon={faTags} className="mr-2 h-4 w-4" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trade.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
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
            <a href={trade.chartImageUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trade.chartImageUrl}
                alt="Chart"
                className="rounded-lg border w-full object-contain max-h-[500px] bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  el.insertAdjacentHTML('afterend', '<a href="' + trade.chartImageUrl + '" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">Xem ảnh ↗ (không load được preview)</a>');
                }}
              />
            </a>
          </CardContent>
        </Card>
      )}

      {/* Note */}
      {trade.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <FontAwesomeIcon icon={faNoteSticky} className="mr-2 h-4 w-4" />
              Nhật ký / Ghi chú
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.note}</p>
          </CardContent>
        </Card>
      )}
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
