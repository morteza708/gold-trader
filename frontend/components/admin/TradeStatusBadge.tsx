import { CheckCircle2, XCircle, Clock, Ban } from "lucide-react";

interface TradeStatusBadgeProps {
  status: "success" | "failed" | "pending" | "cancelled";
}

export default function TradeStatusBadge({ status }: TradeStatusBadgeProps) {
  if (status === "success") {
    return (
      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
        <CheckCircle2 size={12} />
        موفق
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
        <XCircle size={12} />
        ناموفق
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
        <Ban size={12} />
        لغو شده
      </span>
    );
  }
  return (
    <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
      <Clock size={12} />
      در انتظار
    </span>
  );
}

