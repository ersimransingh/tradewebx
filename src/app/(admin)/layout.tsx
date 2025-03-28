"use client";

import { useSidebar } from "@/context/SidebarContext";
import { useTheme } from "@/context/ThemeContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { colors } = useTheme();

  const mainContentWidth = isMobileOpen ? "w-full" : isExpanded || isHovered ? "lg:w-[calc(100%-290px)]" : "lg:w-[calc(100%-90px)]"
  return (
    <div className="min-h-screen">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ease-in-out ${mainContentWidth} ml-auto`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-2 mx-auto md:p-3"
          style={{ backgroundColor: colors?.background2 || '#f0f0f0' }}
        >{children}</div>
      </div>
    </div>
  );
}
