"use client";

import { useState } from "react";
import { Headphones, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupportInfo } from "@/hooks/useSupportInfo";
import SupportHubPanel from "./SupportHubPanel";

export default function SupportFab() {
  const { info, loading } = useSupportInfo({ pollMs: 60000 });
  const [open, setOpen] = useState(false);

  if (loading || !info.enabled || !info.show_floating_button || !info.has_any_channel) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="fixed z-[90] bottom-24 md:bottom-8 left-4 right-4 md:left-8 md:right-auto md:w-[420px] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-h-[min(80vh,640px)] flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                  <Headphones size={20} className="text-gold-600" />
                  مرکز پشتیبانی
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-200 text-gray-500 transition-colors"
                  aria-label="بستن"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <SupportHubPanel info={info} variant="light" compact />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.94 }}
        className={`fixed z-[70] bottom-24 md:bottom-8 md:left-8 left-4 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-colors ${
          info.is_online
            ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
            : "bg-orange-400 hover:bg-orange-500 shadow-orange-400/30"
        }`}
        aria-label="پشتیبانی"
      >
        <Headphones size={24} />
        <span
          className={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-white ${
            info.is_online ? "bg-white" : "bg-gray-200"
          }`}
        />
      </motion.button>
    </>
  );
}
