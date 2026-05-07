"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const NavigationContext = createContext<{
  setNavigating: (v: boolean) => void;
}>({ setNavigating: () => {} });

export function useNavigation() {
  return useContext(NavigationContext);
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  // Hide the overlay as soon as the new page's pathname is committed
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <NavigationContext.Provider value={{ setNavigating: setIsNavigating }}>
      {children}
      {isNavigating && (
        <div className="fixed inset-0 z-[9998] bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border-4 border-[#e0ddd6] border-t-[#1a6b4a] animate-spin" />
        </div>
      )}
    </NavigationContext.Provider>
  );
}
