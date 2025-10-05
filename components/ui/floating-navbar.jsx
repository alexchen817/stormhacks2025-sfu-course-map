"use client";
import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export const FloatingNav = ({ className, onSearch }) => {
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchValue.trim()) {
      // Call the onSearch function passed from parent
      if (onSearch) {
        onSearch(searchValue);
      }
    }
  };

  const handleChange = (e) => {
    setSearchValue(e.target.value);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed left-1/2 top-8 z-[5000] flex max-w-fit -translate-x-1/2 items-center justify-center space-x-4 rounded-full border border-transparent bg-[#111827]/90 px-10 py-2 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.25),0px_10px_20px_-15px_rgba(255,255,255,0.15)] backdrop-blur",
          className
        )}
      >
        <Image
          src="/sfu_logo.png"
          alt="SFU logo"
          width={32}
          height={32}
          className="h-8 w-8 object-contain scale-150"
          priority
        />
        <span className="text-sm text-[#F9FAFB] dark:text-neutral-50">Course Map</span>
        <label className="relative text-[#F9FAFB]">
          <span className="sr-only">Search courses</span>
          <input
            type="search"
            placeholder="CMPT225, CMPT271..."
            value={searchValue}
            onChange={handleChange}
            onKeyDown={handleSearch}
            className="h-9 w-48 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </label>
        <button
          type="button"
          onClick={() => window.resetGraph && window.resetGraph()}
          className="h-9 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-medium uppercase tracking-[0.16em] text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          Reset View
        </button>
        <span className="absolute inset-x-0 mx-auto -bottom-px h-px w-1/2 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
      </motion.div>
    </AnimatePresence>
  );
};
