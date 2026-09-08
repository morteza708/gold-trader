"use client";

import { useEffect } from "react";
import ReygiriLookupCard from "@/components/reygiri/ReygiriLookupCard";

export default function AdminReygiriPage() {
  useEffect(() => {
    document.title = "استعلام ریگیری | پنل مدیریت";
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-white">استعلام ریگیری</h1>
        <p className="text-sm text-slate-400 mt-2 leading-7">
          استعلام عیار از سرویس تهحساب برای پشتیبانی کاربران و بررسی پاکت‌ها.
        </p>
      </div>
      <ReygiriLookupCard variant="dark" />
    </div>
  );
}
