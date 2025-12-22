"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, Gamepad2, User, Swords, Store } from "lucide-react";
import { canClaimDailyReward } from "@/lib/userStars";

// Page enum for active state
export type PageType = "store" | "games" | "home" | "challenge" | "profile";

// Navigation items configuration
const navigationItems = [
  {
    href: "/store",
    page: "store" as PageType,
    label: "Mağaza",
    icon: Store,
    hasBadge: true, // This item can have a badge
  },
  {
    href: "/games",
    page: "games" as PageType,
    label: "Oyunlar",
    icon: Gamepad2,
  },
  {
    href: "/",
    page: "home" as PageType,
    label: "Bölümler",
    icon: Map,
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
  const [hasReward, setHasReward] = useState(false);

  // Check if daily reward is available
  useEffect(() => {
    setHasReward(canClaimDailyReward());
    
    // Re-check every minute in case day changes
    const interval = setInterval(() => {
      setHasReward(canClaimDailyReward());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const isActive = (page: PageType) => {
    return currentPage === page;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-sm border-t border-slate-800">
      <div className="max-w-lg mx-auto w-full">
        <div className="flex items-center py-2 px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const showBadge = item.hasBadge && hasReward && !isActive(item.page);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-200 ${
                  isActive(item.page)
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-emerald-400"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  
                  {/* Badge for daily reward */}
                  {showBadge && (
                    <div className="absolute -top-1 -right-1.5">
                      <span className="flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    </div>
                  )}
                </div>
                
                <span className="text-[10px] font-medium">
                  {item.label}
                </span>
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
