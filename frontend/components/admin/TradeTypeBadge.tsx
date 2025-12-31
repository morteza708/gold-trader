import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { Trade } from "@/types/admin";

interface TradeTypeBadgeProps {
  type: Trade["type"];
}

export default function TradeTypeBadge({ type }: TradeTypeBadgeProps) {
  return type === "buy" ? (
    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
      <ArrowUpRight size={12} />
      خرید
    </span>
  ) : (
    <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
      <ArrowDownRight size={12} />
      فروش
    </span>
  );
}

