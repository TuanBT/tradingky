"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faCalculator,
  faScaleBalanced,
} from "@fortawesome/free-solid-svg-icons";

export default function RiskPage() {
  // Position Size Calculator
  const [accountSize, setAccountSize] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);

  const riskAmount = accountSize * (riskPercent / 100);
  const priceDiff = Math.abs(entryPrice - stopLoss);
  const positionSize = priceDiff > 0 ? riskAmount / priceDiff : 0;

  // R:R Calculator
  const [rrEntry, setRrEntry] = useState<number>(0);
  const [rrStop, setRrStop] = useState<number>(0);
  const [rrTarget, setRrTarget] = useState<number>(0);

  const rrRisk = Math.abs(rrEntry - rrStop);
  const rrReward = Math.abs(rrTarget - rrEntry);
  const rrRatio = rrRisk > 0 ? rrReward / rrRisk : 0;
  const requiredWinRate = rrRatio > 0 ? (1 / (1 + rrRatio)) * 100 : 0;

  // Compound Calculator
  const [startBalance, setStartBalance] = useState<number>(1000);
  const [monthlyReturn, setMonthlyReturn] = useState<number>(5);
  const [months, setMonths] = useState<number>(12);

  const compoundResults = Array.from({ length: months }, (_, i) => {
    const balance = startBalance * Math.pow(1 + monthlyReturn / 100, i + 1);
    return { month: i + 1, balance };
  });
  const finalBalance = months > 0 ? compoundResults[months - 1].balance : startBalance;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FontAwesomeIcon icon={faShieldHalved} className="h-6 w-6 text-blue-500" />
          Công cụ quản lý rủi ro
        </h1>
        <p className="text-muted-foreground mt-1">Tính toán position size, Risk:Reward, và lãi kép</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Size Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FontAwesomeIcon icon={faCalculator} className="h-4 w-4 text-emerald-500" />
              Position Size Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Số dư tài khoản ($)</Label>
                <Input
                  type="number"
                  value={accountSize || ""}
                  onChange={(e) => setAccountSize(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">% Rủi ro mỗi lệnh</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={riskPercent || ""}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Giá vào lệnh</Label>
                <Input
                  type="number"
                  step="any"
                  value={entryPrice || ""}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Giá Stop Loss</Label>
                <Input
                  type="number"
                  step="any"
                  value={stopLoss || ""}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2 bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Số tiền rủi ro:</span>
                <span className="font-mono font-semibold text-red-500">${riskAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Khoảng cách SL:</span>
                <span className="font-mono">{priceDiff.toFixed(4)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Position Size:</span>
                <span className="font-mono font-bold text-lg text-emerald-500">
                  {positionSize.toFixed(4)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk:Reward Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FontAwesomeIcon icon={faScaleBalanced} className="h-4 w-4 text-amber-500" />
              Risk:Reward Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Giá vào</Label>
                <Input
                  type="number"
                  step="any"
                  value={rrEntry || ""}
                  onChange={(e) => setRrEntry(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Stop Loss</Label>
                <Input
                  type="number"
                  step="any"
                  value={rrStop || ""}
                  onChange={(e) => setRrStop(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Take Profit</Label>
                <Input
                  type="number"
                  step="any"
                  value={rrTarget || ""}
                  onChange={(e) => setRrTarget(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2 bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rủi ro (Risk):</span>
                <span className="font-mono text-red-500">{rrRisk.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lợi nhuận (Reward):</span>
                <span className="font-mono text-green-500">{rrReward.toFixed(4)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">R:R Ratio:</span>
                <span className={`font-mono font-bold text-lg ${rrRatio >= 2 ? "text-green-500" : rrRatio >= 1 ? "text-yellow-500" : "text-red-500"}`}>
                  1:{rrRatio.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win rate tối thiểu:</span>
                <span className="font-mono">{requiredWinRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compound Growth Calculator */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📈 Lãi kép (Compound Growth)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Số dư ban đầu ($)</Label>
                <Input
                  type="number"
                  value={startBalance || ""}
                  onChange={(e) => setStartBalance(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Lợi nhuận hàng tháng (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={monthlyReturn || ""}
                  onChange={(e) => setMonthlyReturn(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Số tháng</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={months || ""}
                  onChange={(e) => setMonths(Math.min(120, parseInt(e.target.value) || 1))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Sau {months} tháng:</span>
                <p className="text-2xl font-bold font-mono text-emerald-500">${finalBalance.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Tổng lợi nhuận:</span>
                <p className="text-xl font-bold font-mono text-green-500">
                  +${(finalBalance - startBalance).toFixed(2)} ({((finalBalance / startBalance - 1) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>

            {months <= 24 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Tháng</th>
                      <th className="text-right py-2 px-3">Số dư</th>
                      <th className="text-right py-2 px-3">Lời tháng này</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compoundResults.map((r) => {
                      const prevBalance = r.month === 1 ? startBalance : compoundResults[r.month - 2].balance;
                      const monthProfit = r.balance - prevBalance;
                      return (
                        <tr key={r.month} className="border-b border-muted">
                          <td className="py-1.5 px-3">{r.month}</td>
                          <td className="py-1.5 px-3 text-right font-mono">${r.balance.toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-green-500">+${monthProfit.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
