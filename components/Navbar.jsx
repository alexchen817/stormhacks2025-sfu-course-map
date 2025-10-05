"use client";
import React from "react";
import { FloatingNav } from "./ui/floating-navbar";

export function FloatingNavDemo({ onSearch }) {
  return <FloatingNav onSearch={onSearch} />;
}