"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers3,
  Building2,
  Building,
  Package,
  ShieldCheck,
  Calculator,
  Clock3,
  ScrollText,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Car,
  MapPin,
  PackageSearch,
  SlidersHorizontal,
  Tags,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { hasPermission, type SessionUser } from "@/lib/authz";

interface SidebarProps {
  user: SessionUser;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function formatRole(role: string) {
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function Sidebar({ user, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const isAssetDisposalPath = pathname.startsWith("/assets/disposals");
  const isAssetDistributionPath = pathname.startsWith("/assets/persebaran");
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "master-data": pathname.startsWith("/master-data"),
    assets: pathname.startsWith("/assets") && !isAssetDisposalPath && !isAssetDistributionPath,
    reports: pathname.startsWith("/reports"),
    settings: pathname.startsWith("/settings"),
  });

  // Automatically expand sections when navigating
  useEffect(() => {
    if (pathname.startsWith("/master-data")) {
      setExpandedMenus((prev) => ({ ...prev, "master-data": true }));
    }
    if (pathname.startsWith("/settings")) {
      setExpandedMenus((prev) => ({ ...prev, settings: true }));
    }
    if (pathname.startsWith("/assets") && !isAssetDisposalPath && !isAssetDistributionPath) {
      setExpandedMenus((prev) => ({ ...prev, assets: true }));
    }
    if (pathname.startsWith("/reports")) {
      setExpandedMenus((prev) => ({ ...prev, reports: true }));
    }
  }, [pathname]);

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const closeMobileSidebar = () => {
    setIsOpen(false);
  };

  // Check permissions for parent menus and submenus
  const showMasterData = hasPermission(user, "unit.read") || hasPermission(user, "badan-hukum.read");
  const showUnit = hasPermission(user, "unit.read");
  const showLocation = hasPermission(user, "unit.read");
  const showBadanHukum = hasPermission(user, "badan-hukum.read");
  const showDisposalLookups = user.role === "superadmin";
  const showAssetStatuses = user.role === "superadmin";
  const showAssetCategories = user.role === "superadmin";

  const showAssets = hasPermission(user, "asset.read");
  const showDisposals = hasPermission(user, "asset.disposal.view");
  const showReports = hasPermission(user, "asset.read");

  const showSettings =
    hasPermission(user, "tax-master.read") ||
    hasPermission(user, "audit.read") ||
    hasPermission(user, "rbac.manage");
  const showTaxMaster = hasPermission(user, "tax-master.read");
  const showAudit = hasPermission(user, "audit.read");
  const showRbac = hasPermission(user, "rbac.manage"); // Covers both users and roles

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: "Master Data",
      href: "/master-data",
      icon: Layers3,
      show: showMasterData,
      submenuKey: "master-data",
      submenus: [
        { title: "Unit", href: "/master-data/units", icon: Building, show: showUnit },
        { title: "Lokasi", href: "/master-data/lokasi", icon: MapPin, show: showLocation },
        { title: "Badan Hukum", href: "/master-data/badan-hukum", icon: Building2, show: showBadanHukum },
        { title: "Lookup Disposal", href: "/master-data/disposal-lookups", icon: SlidersHorizontal, show: showDisposalLookups },
        { title: "Status Aset", href: "/master-data/asset-statuses", icon: Tags, show: showAssetStatuses },
        { title: "Kategori Aset", href: "/master-data/asset-categories", icon: PackageSearch, show: showAssetCategories },
      ],
    },
    {
      title: "Aset",
      href: "/assets",
      icon: Package,
      show: showAssets,
      submenuKey: "assets",
      submenus: [
        { title: "Semua Aset", href: "/assets", icon: Package, show: showAssets },
        { title: "Tanah", href: "/assets/tanah", icon: Layers3, show: showAssets },
        { title: "Bangunan", href: "/assets/bangunan", icon: Building2, show: showAssets },
        { title: "Kendaraan", href: "/assets/kendaraan", icon: Package, show: showAssets },
        { title: "Benda", href: "/assets/benda", icon: Package, show: showAssets },
      ],
    },
    {
      title: "Persebaran Aset",
      href: "/assets/persebaran",
      icon: MapPin,
      show: showAssets,
    },
    {
      title: "Disposal",
      href: "/assets/disposals",
      icon: ScrollText,
      show: showDisposals,
    },
    {
      title: "Reporting",
      href: "/reports",
      icon: BarChart3,
      show: showReports,
      submenuKey: "reports",
      submenus: [
        { title: "Ringkasan", href: "/reports", icon: BarChart3, show: showReports },
        { title: "Tanah", href: "/reports/tanah", icon: Layers3, show: showReports },
        { title: "Bangunan", href: "/reports/bangunan", icon: Building2, show: showReports },
        { title: "Kendaraan", href: "/reports/kendaraan", icon: Car, show: showReports },
        { title: "Benda", href: "/reports/benda", icon: Package, show: showReports },
      ],
    },
    {
      title: "Depresiasi",
      href: "/depreciation",
      icon: Clock3,
      show: showReports,
    },
    {
      title: "Pengaturan & RBAC",
      href: "/settings",
      icon: ShieldCheck,
      show: showSettings,
      submenuKey: "settings",
      submenus: [
        { title: "Master Pajak", href: "/settings/tax-master", icon: Calculator, show: showTaxMaster },
        { title: "Audit Log", href: "/settings/audit", icon: ScrollText, show: showAudit },
        { title: "Pengguna", href: "/settings/rbac/users", icon: Users, show: showRbac },
        { title: "Role & Permission", href: "/settings/rbac/roles", icon: ShieldCheck, show: showRbac },
      ],
    },
  ];

  const renderSidebarContent = (collapsed: boolean) => (
    <div className={`flex h-full flex-col bg-slate-900 text-slate-100 relative ${
      collapsed ? "overflow-visible" : "overflow-hidden"
    }`}>
      {/* Brand Header */}
      <div className={`flex h-16 items-center border-b border-slate-800 bg-slate-950/40 transition-all duration-300 ${
        collapsed ? "justify-center px-2" : "gap-3 px-6"
      }`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
          <Building2 className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 truncate">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">SIAKAS</p>
            <p className="text-sm font-semibold tracking-wide text-white truncate">Keuskupan Surabaya</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 no-scrollbar py-6 space-y-1.5 font-sans transition-all duration-300 ${
        collapsed ? "px-2 overflow-visible" : "px-4 overflow-y-auto"
      }`}>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const hasSubmenu = !!item.submenus;
            const isExpanded = item.submenuKey ? expandedMenus[item.submenuKey] : false;
            const isParentActive =
              item.submenuKey === "assets"
                ? pathname === "/assets" || (pathname.startsWith("/assets/") && !isAssetDisposalPath && !isAssetDistributionPath)
                : pathname === item.href || pathname.startsWith(item.href);
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href) && !item.submenus;

            return (
              <div key={item.title} className="space-y-1 group relative">
                {collapsed ? (
                  // Collapsed Navigation Item
                  <div className="relative flex items-center justify-center">
                    {hasSubmenu ? (
                      <>
                        <Link
                          href={item.href}
                          onClick={closeMobileSidebar}
                          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                            isParentActive
                              ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                              : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                        </Link>
                        {/* Floating Submenu */}
                        <div className="absolute left-full top-0 ml-2 hidden group-hover:flex flex-col bg-slate-950 border border-slate-800 rounded-xl p-2 min-w-[200px] z-50 shadow-2xl space-y-1">
                          <div className="px-3 py-1.5 border-b border-slate-800 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                            {item.title}
                          </div>
                          {item.submenus
                            ?.filter((sub) => sub.show)
                            .map((sub) => {
                              const SubIcon = sub.icon;
                              const isSubActive = sub.href === "/assets" ? pathname === "/assets" : pathname.startsWith(sub.href);

                              return (
                                <Link
                                  key={sub.title}
                                  href={sub.href}
                                  onClick={closeMobileSidebar}
                                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                                    isSubActive
                                      ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                                      : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                                  }`}
                                >
                                  <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{sub.title}</span>
                                </Link>
                              );
                            })}
                        </div>
                      </>
                    ) : (
                      <>
                        <Link
                          href={item.href}
                          onClick={closeMobileSidebar}
                          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                            isActive
                              ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                              : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                        </Link>
                        {/* Custom Tooltip */}
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 whitespace-nowrap z-50 shadow-xl">
                          {item.title}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // Expanded Navigation Item
                  <>
                    {hasSubmenu ? (
                      <div className="flex items-center justify-between rounded-xl transition-colors hover:bg-slate-800/60">
                        <Link
                          href={item.href}
                          onClick={closeMobileSidebar}
                          className={`flex flex-1 items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                            isParentActive
                              ? "text-emerald-400 font-semibold"
                              : "text-slate-300 hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                        <button
                          onClick={(e) => item.submenuKey && toggleExpand(item.submenuKey, e)}
                          className="flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white"
                          aria-label="Toggle submenu"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={closeMobileSidebar}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-emerald-600/15 text-emerald-400 font-semibold border-l-2 border-emerald-500 rounded-l-none pl-3.5"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    )}

                    {/* Submenu rendering */}
                    {hasSubmenu && isExpanded && (
                      <div className="pl-6 pr-2 py-1 space-y-1 border-l border-slate-800 ml-6 mt-1">
                        {item.submenus
                          ?.filter((sub) => sub.show)
                          .map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = sub.href === "/assets" ? pathname === "/assets" : pathname.startsWith(sub.href);

                            return (
                              <Link
                                key={sub.title}
                                href={sub.href}
                                onClick={closeMobileSidebar}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                                  isSubActive
                                    ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                                    : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                                }`}
                              >
                                <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>{sub.title}</span>
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
      </nav>

      {/* User Profile & Logout */}
      <div className={`border-t border-slate-800 bg-slate-950/20 transition-all duration-300 ${
        collapsed ? "p-2" : "p-4"
      }`}>
        <div className={`flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/50 transition-all duration-300 ${
          collapsed ? "flex-col gap-3 p-2" : "gap-2 p-3"
        } group relative`}>
          <div className={`flex items-center min-w-0 transition-all duration-300 ${
            collapsed ? "justify-center" : "gap-3"
          }`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 text-xs font-semibold border border-emerald-800/40">
              {getInitials(user.name)}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">{user.name}</p>
                <p className="truncate text-[10px] text-slate-400">{formatRole(user.role)}</p>
              </div>
            )}
          </div>

          <form action="/api/logout" method="post" className="flex shrink-0">
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>

          {/* Floating Profile Details Tooltip */}
          {collapsed && (
            <div className="absolute left-full bottom-2 ml-2 hidden group-hover:block bg-slate-950 border border-slate-800 rounded-lg p-2.5 min-w-[150px] z-50 shadow-xl">
              <p className="text-xs font-semibold text-slate-200">{user.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{formatRole(user.role)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="fixed top-0 inset-x-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 focus-visible:outline-none"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-900 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-wide">SIAKAS</span>
          </div>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
          {getInitials(user.name)}
        </div>
      </header>

      {/* Desktop Sidebar (Fixed/Collapsible) */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-800 bg-slate-900 md:block transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "w-[80px] overflow-visible" : "w-[260px] overflow-hidden"
      }`}>
        {renderSidebarContent(isCollapsed)}

        {/* Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 shadow-md hover:bg-slate-700 hover:text-white transition-all cursor-pointer focus:outline-none"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}
      </aside>

      {/* Mobile Sidebar (Slide-over drawer, always fully expanded) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={closeMobileSidebar}
          />

          {/* Drawer container */}
          <div className="relative flex w-full max-w-[280px] flex-col animate-slide-in">
            {/* Close button inside drawer */}
            <div className="absolute right-4 top-4 z-10">
              <button
                onClick={closeMobileSidebar}
                className="rounded-lg bg-slate-950/20 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-full w-full">{renderSidebarContent(false)}</div>
          </div>
        </div>
      )}
    </>
  );
}




