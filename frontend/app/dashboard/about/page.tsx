"use client";

import { useEffect, useState } from "react";
import SitePageView from "@/components/site/SitePageView";
import SupportHubPanel from "@/components/support/SupportHubPanel";
import { pagesAPI, SitePage } from "@/lib/api/pages";
import { supportAPI, SupportInfo } from "@/lib/api/support";
import { pageTitle } from "@/lib/brand";
import { Headphones, Loader2 } from "lucide-react";

export default function AboutPage() {
  const [page, setPage] = useState<SitePage | null>(null);
  const [supportInfo, setSupportInfo] = useState<SupportInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = pageTitle("درباره ما");
    let cancelled = false;
    (async () => {
      try {
        const [pageData, supportData] = await Promise.all([
          pagesAPI.getPublic("about"),
          supportAPI.getInfo().catch(() => null),
        ]);
        if (!cancelled) {
          setPage(pageData);
          setSupportInfo(supportData);
        }
      } catch {
        if (!cancelled) setError("بارگذاری صفحه با مشکل مواجه شد.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showSupportHub =
    supportInfo?.enabled &&
    supportInfo.show_on_public_site &&
    supportInfo.has_any_channel;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-gray-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="text-center py-24 text-gray-500 text-sm">
        {error || "صفحه یافت نشد"}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {showSupportHub && supportInfo && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <Headphones size={20} className="text-gold-600" />
            پشتیبانی
          </h2>
          <SupportHubPanel info={supportInfo} variant="light" compact />
        </div>
      )}
      <SitePageView page={page} variant="dashboard" showContactBlock />
    </div>
  );
}
