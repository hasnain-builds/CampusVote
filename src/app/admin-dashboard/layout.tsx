"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Vote,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const adminInfo = {
    name: "Hasnain Sheikh",
  };

  // Helper to determine if a nav link is active
  const isActive = (href: string) => {
    if (href === "/admin-dashboard") {
      return pathname === "/admin-dashboard";
    }
    return pathname.startsWith(href) && pathname !== "/admin-dashboard";
  };

  // Get initials for profile fallback avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 md:hidden ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo Header */}
          <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-100">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm shadow-blue-500/10">
              <Vote className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Campus<span className="text-blue-600">Vote</span>
            </span>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 ml-auto cursor-pointer flex items-center justify-center min-h-[36px]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <Icon className={`h-4.5 w-4.5 transition-colors ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                  {item.label}
                  {active && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        {/* Profile / Logout */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-50 bg-slate-50/50 mb-3">
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                {getInitials(adminInfo.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">{adminInfo.name}</span>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 border border-slate-100 hover:border-red-100 cursor-pointer min-h-[48px]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Console
          </Link>
        </div>
      </div>

      {/* Desktop Sidebar (hidden on mobile, visible on md:flex) */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-100">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm shadow-blue-500/10">
              <Vote className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Campus<span className="text-blue-600">Vote</span>
            </span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ml-auto">
              Admin
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                  />
                  {item.label}
                  {active && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Admin Profile & Logout */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-50 bg-slate-50/50 mb-3">
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                {getInitials(adminInfo.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">{adminInfo.name}</span>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 border border-slate-100 hover:border-red-100 cursor-pointer min-h-[38px]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Console
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 bg-white px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 md:hidden cursor-pointer flex items-center justify-center min-h-[40px]"
              aria-label="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-bold text-slate-800">
              Control Panel
            </h2>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
