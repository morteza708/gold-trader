import { LucideIcon } from "lucide-react";
import { toPersianDigits } from "@/lib/utils/numberUtils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export default function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-slate-400 font-bold" style={{ color: 'var(--color-white)' }}>
          {title}
        </span>
        <Icon size={16} className={color} />
      </div>
      <h4 className="text-xl font-black text-white">{toPersianDigits(value)}</h4>
    </div>
  );
}

