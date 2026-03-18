"use client";

// Currency/asset icon map for common trading pairs
// Uses small emoji flags + custom icons for commodities/crypto

const CURRENCY_ICONS: Record<string, { emoji?: string; label: string; color?: string }> = {
  // Fiat currencies (flag emojis are safe here — used as data icons, not UI decoration)
  GBP: { emoji: "🇬🇧", label: "GBP" },
  USD: { emoji: "🇺🇸", label: "USD" },
  EUR: { emoji: "🇪🇺", label: "EUR" },
  JPY: { emoji: "🇯🇵", label: "JPY" },
  AUD: { emoji: "🇦🇺", label: "AUD" },
  NZD: { emoji: "🇳🇿", label: "NZD" },
  CAD: { emoji: "🇨🇦", label: "CAD" },
  CHF: { emoji: "🇨🇭", label: "CHF" },
  // Commodities
  XAU: { emoji: "🥇", label: "Gold", color: "#FFD700" },
  USOIL: { emoji: "🛢️", label: "Oil", color: "#1a1a1a" },
  // Crypto
  BTC: { emoji: "₿", label: "BTC", color: "#F7931A" },
  ETH: { emoji: "Ξ", label: "ETH", color: "#627EEA" },
};

function parsePair(pair: string): [string, string | null] {
  const upper = pair.toUpperCase().replace(/[/\-_\s]/g, "");
  // Check full string first (e.g. USOIL, BTC, ETH)
  if (CURRENCY_ICONS[upper]) return [upper, null];
  // Try known 3-char currency codes
  for (const len of [3, 4]) {
    const base = upper.slice(0, len);
    const quote = upper.slice(len);
    if (CURRENCY_ICONS[base] && (quote === "" || CURRENCY_ICONS[quote])) {
      return [base, quote || null];
    }
  }
  // Special: XAUUSD → XAU + USD
  if (upper.startsWith("XAU")) return ["XAU", upper.slice(3) || null];
  return [upper, null];
}

interface PairIconProps {
  pair: string;
  className?: string;
  size?: "sm" | "md";
}

export function PairIcon({ pair, className = "", size = "sm" }: PairIconProps) {
  const [base, quote] = parsePair(pair);
  const baseIcon = CURRENCY_ICONS[base];

  if (!baseIcon) return null;

  const quoteIcon = quote ? CURRENCY_ICONS[quote] : null;
  const fontSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <span className={`inline-flex items-center gap-0.5 ${fontSize} ${className}`} title={pair}>
      {baseIcon.color && !baseIcon.emoji?.match(/[\u{1F1E6}-\u{1F1FF}]/u) ? (
        <span style={{ color: baseIcon.color }} className="font-bold">{baseIcon.emoji}</span>
      ) : (
        <span>{baseIcon.emoji}</span>
      )}
      {quoteIcon && (
        <>
          <span className="text-muted-foreground text-[10px]">/</span>
          {quoteIcon.color && !quoteIcon.emoji?.match(/[\u{1F1E6}-\u{1F1FF}]/u) ? (
            <span style={{ color: quoteIcon.color }} className="font-bold">{quoteIcon.emoji}</span>
          ) : (
            <span>{quoteIcon.emoji}</span>
          )}
        </>
      )}
    </span>
  );
}

export function hasPairIcon(pair: string): boolean {
  const [base] = parsePair(pair);
  return !!CURRENCY_ICONS[base];
}
