import { Home, MessageCircle, MessageSquare, UserCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ProfileMenu } from "@/components/profile-menu";

interface CollapsibleNavRailProps {
  hideMobileNav?: boolean;
}

const navItems = [
  { label: "Home", href: "/dashboard", Icon: Home },
  { label: "Private Chat", href: "/messages", Icon: MessageCircle },
  { label: "Global Chat", href: "/chat", Icon: MessageSquare },
  { label: "Profile", href: "/account", Icon: UserCircle },
] as const;

export function CollapsibleNavRail({ hideMobileNav = false }: CollapsibleNavRailProps) {
  const [location] = useLocation();

  return (
    <>
      <aside className="hidden min-h-[100dvh] w-16 shrink-0 overflow-hidden border-r border-gray-200 bg-white/95 text-gray-700 shadow-sm transition-all duration-300 ease-out dark:border-gray-800 dark:bg-gray-950/95 lg:flex group hover:w-64">
        <div className="flex h-full flex-col justify-between overflow-hidden">
          <div className="flex flex-col gap-2 py-4">
            <div className="flex items-center gap-3 px-4 pb-4">
              
              <div className="overflow-hidden transition-all duration-300 group-hover:max-w-[9rem] group-hover:opacity-100 max-w-0 opacity-0">
                <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#000000]">Uchat</p>
              </div>
            </div>

            <nav className="space-y-1 px-2">
              {navItems.map(({ href, Icon, label }) => {
                const isActive = location.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 rounded-3xl px-3 py-3 transition-all duration-300 ${isActive ? "bg-purple-50 text-purple-600 shadow-sm" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900/80"}`}
                  >
                    <Icon className={`h-6 w-6 ${isActive ? "text-purple-600" : "text-gray-500 dark:text-gray-400"}`} />
                    <span className={`overflow-hidden whitespace-nowrap text-[13px] tracking-[-0.01em] transition-all duration-300 ${isActive ? "font-semibold text-purple-600" : "font-normal text-[#333333] dark:text-gray-300"} group-hover:max-w-[10rem] max-w-0 opacity-0 group-hover:opacity-100`}>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-gray-200 px-2 pb-4 pt-3 dark:border-gray-800">
            <ProfileMenu />
          </div>
        </div>
      </aside>

      {!hideMobileNav ? (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-gray-200 bg-white/95 px-3 py-2 shadow-inner backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 md:hidden">
          {navItems.filter(({ label }) => label !== "Profile").map(({ href, Icon, label }) => {
            const isActive = location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] transition ${isActive ? "text-purple-600" : "text-gray-500 hover:text-purple-600 dark:text-gray-400"}`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
          <ProfileMenu mobile />
        </nav>
      ) : null}
    </>
  );
}
