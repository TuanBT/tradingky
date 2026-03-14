import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export function InfoRow({
  icon,
  label,
  value,
  mono,
  valueColor,
}: {
  icon: IconDefinition;
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
