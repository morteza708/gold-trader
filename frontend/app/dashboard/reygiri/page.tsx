"use client";

import { useEffect } from "react";
import { pageTitle } from "@/lib/brand";
import ReygiriLookupCard from "@/components/reygiri/ReygiriLookupCard";

export default function DashboardReygiriPage() {
  useEffect(() => {
    document.title = pageTitle("استعلام ریگیری");
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div>
        <h1 className="text-xl font-black text-gray-900">ریگیری</h1>
        <p className="text-sm text-gray-500 mt-1 leading-7">
          نتیجه عیار طلای آب‌شده را با شماره پاکت استعلام کنید.
        </p>
      </div>
      <ReygiriLookupCard variant="light" />
    </div>
  );
}
