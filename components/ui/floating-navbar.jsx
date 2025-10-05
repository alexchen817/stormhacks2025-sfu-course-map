"use client";
import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export const FloatingNav = ({ className }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative flex max-w-fit top-10 inset-x-0 mx-auto items-center justify-center space-x-4 border border-transparent pr-2 pl-8 py-2 rounded-full bg-[#374151] shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] dark:border-white/[0.2] dark:bg-black z-[5000]",
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
            className="h-9 w-48 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </label>
        <span className="absolute inset-x-0 mx-auto -bottom-px h-px w-1/2 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
      </motion.div>
    </AnimatePresence>
  );
};
