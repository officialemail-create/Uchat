import React from "react";
import { CollapsibleNavRail } from "./collapsible-nav-rail";
import { useRoomSocket } from "@/hooks/use-room-socket";

interface AppLayoutProps {
  children: React.ReactNode;
  hideBottomNav?: boolean;
}

export function AppLayout({ children, hideBottomNav = false }: AppLayoutProps) {
  // Initialize global socket listeners for authenticated layout
  useRoomSocket();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <CollapsibleNavRail hideMobileNav={hideBottomNav} />
      <main className="flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden pt-0 md:h-[100dvh] md:pt-0">
        {children}
      </main>
    </div>
  );
}
