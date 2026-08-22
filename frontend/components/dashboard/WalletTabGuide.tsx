"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface WalletTabGuideProps {
  title?: string;
  steps: string[];
  storageKey: string;
}

export default function WalletTabGuide({ title = "راهنمای این بخش", steps, storageKey }: WalletTabGuideProps) {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== "collapsed";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, next ? "open" : "collapsed");
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl overflow-hidden mb-4">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-2 p-4 text-right hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-blue-600 shrink-0" />
          <span className="text-sm font-bold text-blue-900">{title}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-blue-600 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <ol className="px-4 pb-4 space-y-2 list-none">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-2 text-xs text-blue-800/90 leading-relaxed">
              <span className="font-bold text-blue-600 shrink-0">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
