import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { FinancialTransaction } from "@/types/admin";

interface TransactionTypeBadgeProps {
  type: FinancialTransaction["type"];
}

export default function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  return type === "deposit" ? (
    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
      <ArrowDownCircle size={12} />
      واریز
    </span>
  ) : (
    <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
      <ArrowUpCircle size={12} />
      برداشت
    </span>
  );
}

