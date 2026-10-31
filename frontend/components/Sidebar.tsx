"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PlusCircle,
  FileText,
  HelpCircle,
  Network,
  ShieldCheck,
  BookOpen,
  GitCompare,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { getClarifications } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [projectTitle, setProjectTitle] = useState<string>("No Project Selected");
  const [openClarificationsCount, setOpenClarificationsCount] = useState<number>(0);

  useEffect(() => {
    const updateActiveProject = () => {
      const activeId = localStorage.getItem("archmind_active_project_id");
      const activeTitle = localStorage.getItem("archmind_active_project_title");
      if (activeTitle) {
        setProjectTitle(activeTitle);
      } else {
        setProjectTitle("No Project Selected");
      }

      if (activeId) {
        getClarifications(activeId)
          .then((clars) => {
            const openItems = clars.filter((c) => c.status === "open");
            setOpenClarificationsCount(openItems.length);
          })
          .catch(() => {});
      }
    };

    updateActiveProject();
    window.addEventListener("storage", updateActiveProject);
    const interval = setInterval(updateActiveProject, 3000);
    return () => {
      window.removeEventListener("storage", updateActiveProject);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { label: "New Project", href: "/", icon: PlusCircle },
    { label: "Requirements", href: "/requirements", icon: FileText },
    {
      label: "Clarifications",
      href: "/clarifications",
      icon: HelpCircle,
      badge: openClarificationsCount > 0 ? openClarificationsCount : undefined,
    },
    { label: "Architecture", href: "/architecture", icon: Network },
    { label: "Validation & Traceability", href: "/validation", icon: ShieldCheck },
    { label: "Decisions (ADRs)", href: "/decisions", icon: BookOpen },
    { label: "Change Impact", href: "/impact", icon: GitCompare },
    { label: "Export", href: "/export", icon: Download },
  ];

  return (
    <aside
      className={`h-screen bg-[#452080] text-white flex flex-col shrink-0 transition-all duration-200 select-none border-r border-[#3A1B6E] relative z-30 shadow-md ${
        collapsed
          ? "w-[64px] min-w-[64px] max-w-[64px]"
          : "w-[250px] min-w-[250px] max-w-[250px]"
      }`}
    >
      {/* Brand Header */}
      <div className="h-[64px] px-4 flex items-center justify-between border-b border-[#3A1B6E]">
        {!collapsed ? (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#7439D5] flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-[15px] tracking-tight text-white block leading-tight truncate">
                ArchMind AI
              </span>
              <span
                className="text-[11px] font-medium text-[#B8A8DC] block truncate max-w-[155px]"
                title={projectTitle}
              >
                {projectTitle}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[#7439D5] flex items-center justify-center mx-auto shadow-inner" title="ArchMind AI">
            <Sparkles className="w-[18px] h-[18px] text-white" />
          </div>
        )}
      </div>

      {/* Navigation List - 48-52px items */}
      <nav className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`h-[48px] flex items-center rounded-lg px-3 transition-colors duration-150 relative text-[14px] font-medium ${
                isActive
                  ? "bg-[#7439D5] text-white shadow-sm font-semibold"
                  : "text-[#E6E0F5] hover:bg-[#582BA3] hover:text-white"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && (
                <span className="ml-3 truncate leading-none">
                  {item.label}
                </span>
              )}

              {/* Badges */}
              {!collapsed && item.badge !== undefined && (
                <span className="ml-auto bg-[#F59E0B] text-white text-[11px] px-2 py-0.5 rounded-full font-bold leading-none shadow-sm">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge !== undefined && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#F59E0B] rounded-full ring-2 ring-[#452080]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Compact Collapse Toggle at Footer */}
      <div className="p-2 border-t border-[#3A1B6E] flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-[36px] flex items-center justify-center rounded-md text-[#B8A8DC] hover:text-white hover:bg-[#582BA3] transition-colors text-xs font-medium"
          title={collapsed ? "Expand sidebar (250px)" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[12px]">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
