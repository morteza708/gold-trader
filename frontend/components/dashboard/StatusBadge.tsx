import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function StatusBadge({ status }: { status: "success" | "failed" | "pending" }) {
  if (status === "success") {
    return (
      <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
        <CheckCircle2 size={12} /> موفق
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
        <XCircle size={12} /> ناموفق
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-full">
      <Clock size={12} /> در انتظار
    </span>
  );
}
