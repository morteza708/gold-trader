"use client";

import Image from "next/image";
import { Award, Users, MapPin, Phone, Mail, Building } from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import type { SitePage } from "@/lib/api/pages";

function Paragraphs({ text, className }: { text: string; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <div className={className}>
      {text.split(/\n+/).filter(Boolean).map((line, i) => (
        <p key={i} className={i > 0 ? "mt-3" : undefined}>
          {line}
        </p>
      ))}
    </div>
  );
}

type Props = {
  page: SitePage;
  /** داشبورد داخل layout احرازهویتی؛ عمومی با Navbar جدا */
  variant?: "public" | "dashboard";
  showContactBlock?: boolean;
};

export default function SitePageView({
  page,
  variant = "public",
  showContactBlock = true,
}: Props) {
  const hasSections =
    Boolean(page.section_one_title || page.section_one_body) ||
    Boolean(page.section_two_title || page.section_two_body);
  const hasContact =
    showContactBlock &&
    Boolean(page.address || page.phone || page.email || page.extra_image_url);

  return (
    <div
      className={`max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ${
        variant === "dashboard" ? "pb-24 md:pb-0" : "px-4 py-8 md:py-12"
      }`}
    >
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-12 text-center text-white relative overflow-hidden shadow-xl mb-8">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative z-10">
          {page.hero_image_url ? (
            <div className="relative w-full max-w-md mx-auto mb-6 aspect-[16/9] rounded-2xl overflow-hidden border border-white/10">
              <Image
                src={page.hero_image_url}
                alt={page.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 448px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex justify-center mb-4 md:mb-6">
              <BrandLogo variant="mark" size={80} showName={false} />
            </div>
          )}

          <h1 className="text-xl sm:text-2xl md:text-4xl font-black mb-4 leading-tight">
            {page.title}
          </h1>

          {page.subtitle ? (
            <Paragraphs
              text={page.subtitle}
              className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed px-2"
            />
          ) : null}
        </div>
      </div>

      {page.body ? (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm mb-8">
          <Paragraphs
            text={page.body}
            className="text-sm md:text-base text-gray-600 leading-7 text-justify"
          />
        </div>
      ) : null}

      {hasSections ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {(page.section_one_title || page.section_one_body) && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Award size={20} />
              </div>
              {page.section_one_title ? (
                <h3 className="font-bold text-gray-800 mb-2">{page.section_one_title}</h3>
              ) : null}
              <Paragraphs
                text={page.section_one_body}
                className="text-sm text-gray-500 leading-6 text-justify"
              />
            </div>
          )}
          {(page.section_two_title || page.section_two_body) && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Users size={20} />
              </div>
              {page.section_two_title ? (
                <h3 className="font-bold text-gray-800 mb-2">{page.section_two_title}</h3>
              ) : null}
              <Paragraphs
                text={page.section_two_body}
                className="text-sm text-gray-500 leading-6 text-justify"
              />
            </div>
          )}
        </div>
      ) : null}

      {hasContact ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Building className="text-gold-500" size={20} />
            ارتباط با ما
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {page.address ? (
              <div className="flex flex-col items-center text-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <MapPin size={24} className="text-gray-400" />
                <span className="font-bold text-gray-700 text-sm">آدرس دفتر مرکزی</span>
                <span className="text-xs text-gray-500">{page.address}</span>
              </div>
            ) : null}

            {page.phone ? (
              <div className="flex flex-col items-center text-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <Phone size={24} className="text-gray-400" />
                <span className="font-bold text-gray-700 text-sm">تلفن پشتیبانی</span>
                <span className="text-xs text-gray-500 dir-ltr font-mono">{page.phone}</span>
              </div>
            ) : null}

            {page.email ? (
              <div className="flex flex-col items-center text-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <Mail size={24} className="text-gray-400" />
                <span className="font-bold text-gray-700 text-sm">پست الکترونیک</span>
                <span className="text-xs text-gray-500 font-mono">{page.email}</span>
              </div>
            ) : null}
          </div>

          {page.extra_image_url ? (
            <div className="mt-8 relative rounded-2xl overflow-hidden h-48 md:h-64 border border-gray-200">
              <Image
                src={page.extra_image_url}
                alt="تصویر تکمیلی"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                unoptimized
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
