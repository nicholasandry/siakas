"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { type SessionUser } from "@/lib/authz";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: SessionUser;
}

export default function DashboardLayoutClient({
  children,
  user,
}: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize from localStorage on mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
    setIsMounted(true);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar
        user={user}
        isCollapsed={isMounted ? isCollapsed : false}
        onToggleCollapse={toggleCollapse}
      />
      <div
        className={`flex flex-col transition-[padding] duration-300 ease-in-out ${
          isMounted && isCollapsed ? "md:pl-[80px]" : "md:pl-[260px]"
        }`}
      >
        {/* Padding-top on mobile to avoid overlapping with fixed mobile header */}
        <main className="flex-1 pt-16 md:pt-0">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
