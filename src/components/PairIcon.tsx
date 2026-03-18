"use client";

import { CircleFlag } from "react-circle-flags";

// Currency → ISO country code mapping for circle-flags
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  GBP: "gb", USD: "us", EUR: "eu", JPY: "jp",
  AUD: "au", NZD: "nz", CAD: "ca", CHF: "ch",
  CNY: "cn", HKD: "hk", SGD: "sg", KRW: "kr",
  INR: "in", THB: "th", MXN: "mx", ZAR: "za",
  SEK: "se", NOK: "no", DKK: "dk", PLN: "pl",
  TRY: "tr", BRL: "br", RUB: "ru", CZK: "cz",
};

// Non-country assets — inline SVG icons
function GoldIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="rounded-full">
      <circle cx="16" cy="16" r="16" fill="#FFD700" />
      <text x="16" y="22" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#8B6914">Au</text>
    </svg>
  );
}

function OilIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="rounded-full">
      <circle cx="16" cy="16" r="16" fill="#1a1a1a" />
      <text x="16" y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#e5e5e5">OIL</text>
    </svg>
  );
}

function BtcIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="rounded-full">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <text x="16" y="22" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#fff">₿</text>
    </svg>
  );
}

function EthIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="rounded-full">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <text x="16" y="22" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#fff">Ξ</text>
    </svg>
  );
}

const SPECIAL_ASSETS: Record<string, (props: { size: number }) => React.ReactNode> = {
  XAU: GoldIcon, XAG: GoldIcon,
  USOIL: OilIcon, WTI: OilIcon, BRENT: OilIcon, OIL: OilIcon,
  BTC: BtcIcon, ETH: EthIcon,
};

function parsePair(pair: string): [string, string | null] {
  const upper = pair.toUpperCase().replace(/[/\-_\s]/g, "");
  // Check full string against special assets first
  if (SPECIAL_ASSETS[upper]) return [upper, null];
  // Try known currency codes (3-char)
  for (const len of [3, 4]) {
    const base = upper.slice(0, len);
    const quote = upper.slice(len);
    if ((CURRENCY_TO_COUNTRY[base] || SPECIAL_ASSETS[base]) && (quote === "" || CURRENCY_TO_COUNTRY[quote] || SPECIAL_ASSETS[quote])) {
      return [base, quote || null];
    }
  }
  return [upper, null];
}

function renderIcon(code: string, px: number) {
  const SpecialIcon = SPECIAL_ASSETS[code];
  if (SpecialIcon) return <SpecialIcon size={px} />;
  const country = CURRENCY_TO_COUNTRY[code];
  if (country) return <CircleFlag countryCode={country} height={px} width={px} />;
  return null;
}

interface PairIconProps {
  pair: string;
  className?: string;
  size?: "sm" | "md";
}

export function PairIcon({ pair, className = "", size = "sm" }: PairIconProps) {
  const [base, quote] = parsePair(pair);
  const px = size === "sm" ? 18 : 24;
  const baseEl = renderIcon(base, px);

  if (!baseEl) return null;

  const quoteEl = quote ? renderIcon(quote, px) : null;

  return (
    <span className={`inline-flex items-center ${className}`} title={pair}>
      <span className="relative flex items-center">
        <span className="rounded-full overflow-hidden flex-shrink-0" style={{ width: px, height: px }}>
          {baseEl}
        </span>
        {quoteEl && (
          <span className="rounded-full overflow-hidden flex-shrink-0 -ml-1.5 ring-2 ring-background" style={{ width: px, height: px }}>
            {quoteEl}
          </span>
        )}
      </span>
    </span>
  );
}

export function hasPairIcon(pair: string): boolean {
  const [base] = parsePair(pair);
  return !!(CURRENCY_TO_COUNTRY[base] || SPECIAL_ASSETS[base]);
}
