"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import SitePageView from "@/components/site/SitePageView";
import SupportHubPanel from "@/components/support/SupportHubPanel";
import { pagesAPI, SitePage } from "@/lib/api/pages";
import { supportAPI, SupportInfo } from "@/lib/api/support";
import { pageTitle } from "@/lib/brand";
import { Headphones, Loader2 } from "lucide-react";

export default function ContactPublicPage() {
  const [page, setPage] = useState<SitePage | null>(null);
  const [supportInfo, setSupportInfo] = useState<SupportInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = pageTitle("تماس با ما");
    let cancelled = false;
    (async () => {
      try {
        const [pageData, supportData] = await Promise.all([
          pagesAPI.getPublic("contact"),
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

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      {loading ? (
        <div className="flex justify-center items-center py-24 text-gray-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : error || !page ? (
        <div className="text-center py-24 text-gray-500 text-sm">{error || "صفحه یافت نشد"}</div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
          {showSupportHub && supportInfo && (
            <section className="pt-8">
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                <h2 className="font-black text-gray-900 mb-6 flex items-center gap-2 text-lg">
                  <Headphones size={22} className="text-gold-600" />
                  تماس سریع با پشتیبانی
                </h2>
                <SupportHubPanel info={supportInfo} variant="light" />
              </div>
            </section>
          )}
          <SitePageView page={page} variant="public" showContactBlock />
        </div>
      )}
    </main>
  );
}
