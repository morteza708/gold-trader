"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import SitePageView from "@/components/site/SitePageView";
import { pagesAPI, SitePage } from "@/lib/api/pages";
import { pageTitle } from "@/lib/brand";
import { Loader2 } from "lucide-react";

export default function ContactPublicPage() {
  const [page, setPage] = useState<SitePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = pageTitle("تماس با ما");
    let cancelled = false;
    (async () => {
      try {
        const data = await pagesAPI.getPublic("contact");
        if (!cancelled) setPage(data);
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
        <SitePageView page={page} variant="public" showContactBlock />
      )}
    </main>
  );
}
