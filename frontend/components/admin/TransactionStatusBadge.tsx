import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { FinancialTransaction } from "@/types/admin";

interface TransactionStatusBadgeProps {
  status: FinancialTransaction["status"];
}

export default function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const configs = {
    pending: { text: "در انتظار", bg: "bg-orange-500/20", textColor: "text-orange-400", icon: Clock },
    approved: { text: "تایید شده", bg: "bg-green-500/20", textColor: "text-green-400", icon: CheckCircle2 },
    rejected: { text: "رد شده", bg: "bg-red-500/20", textColor: "text-red-400", icon: XCircle },
  };
  
  const config = configs[status];
  const Icon = config.icon;
  
  return (
    <span className={`${config.bg} ${config.textColor} px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1`}>
      <Icon size={12} />
      {config.text}
    </span>
  );
}

