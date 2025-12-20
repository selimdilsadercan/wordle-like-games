"use client";

import Link from "next/link";
import { Map, Gamepad2, User, Swords } from "lucide-react";

// Page enum for active state
export type PageType = "home" | "games" | "challenge" | "profile";

// Navigation items configuration
const navigationItems = [
  {
    href: "/",
    page: "home" as PageType,
    label: "Bölümler",
    icon: Map,
  },
  {
    href: "/games",
    page: "games" as PageType,
    label: "Oyunlar",
    icon: Gamepad2, 
  },
  {
    href: "/challenge",
    page: "challenge" as PageType,
    label: "Meydan Oku",
    icon: Swords,
  },
  {
    href: "/profile",
    page: "profile" as PageType,
    label: "Profil",
    icon: User,
  },
];

interface AppBarProps {
  currentPage: PageType;
}

export default function AppBar({ currentPage }: AppBarProps) {
  const isActive = (page: PageType) => {
    return currentPage === page;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-sm border-t border-slate-800">
      <div className="max-w-lg mx-auto w-full">
        <div className="flex items-center py-2 px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-200 ${
                  isActive(item.page)
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-emerald-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
