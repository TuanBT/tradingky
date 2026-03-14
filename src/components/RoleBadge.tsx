import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faUserShield } from "@fortawesome/free-solid-svg-icons";
import type { UserRole } from "@/lib/types";

export function RoleBadge({ role, size = "sm" }: { role?: UserRole; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "h-4 w-4" : "h-3 w-3";
  if (role === "admin")
    return <FontAwesomeIcon icon={faCrown} className={`${sizeClass} text-yellow-500`} title="Admin" />;
  if (role === "mod")
    return <FontAwesomeIcon icon={faUserShield} className={`${sizeClass} text-blue-500`} title="Mod" />;
  return null;
}
