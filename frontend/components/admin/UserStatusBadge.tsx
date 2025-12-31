import { CheckCircle2, XCircle, Activity } from "lucide-react";
import type { User } from "@/types/admin";

interface UserStatusBadgeProps {
  status: User["status"];
}

export default function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const configs = {
    active: { text: "فعال", bg: "bg-green-500/20", textColor: "text-green-400", icon: CheckCircle2 },
    blocked: { text: "مسدود", bg: "bg-red-500/20", textColor: "text-red-400", icon: XCircle },
    pending: { text: "در انتظار", bg: "bg-orange-500/20", textColor: "text-orange-400", icon: Activity },
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

