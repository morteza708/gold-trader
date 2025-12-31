import { Shield, XCircle, Activity } from "lucide-react";
import type { User } from "@/types/admin";

interface VerificationBadgeProps {
  status: User["verificationStatus"];
}

export default function VerificationBadge({ status }: VerificationBadgeProps) {
  const configs = {
    verified: { text: "احراز شده", bg: "bg-blue-500/20", textColor: "text-blue-400", icon: Shield },
    unverified: { text: "احراز نشده", bg: "bg-gray-500/20", textColor: "text-gray-400", icon: XCircle },
    pending: { text: "در انتظار", bg: "bg-yellow-500/20", textColor: "text-yellow-400", icon: Activity },
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

