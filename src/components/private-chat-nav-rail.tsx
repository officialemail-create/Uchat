import { Home, MessageCircle, MessageSquare, UserCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

const navItems = [
  { label: "Home", href: "/dashboard", Icon: Home },
  { label: "Private", href: "/messages", Icon: MessageCircle },
  { label: "Global", href: "/chat", Icon: MessageSquare },
  { label: "Profile", href: "/account", Icon: UserCircle },
] as const;

export function NavRail() {
  const [location] = useLocation();

  return (
    <>
      <aside className="hidden min-h-[100dvh] w-20 shrink-0 flex-col items-center gap-3 border-r border-gray-200 bg-white/90 px-2 py-4 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/90 dark:text-gray-300 lg:flex">
        <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-900/25 dark:text-purple-300">
          <span className="text-sm font-semibold tracking-[0.18em] uppercase text-purple-700">U</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-start gap-2 pt-8">
          {navItems.map(({ href, Icon, label }) => {
            const isActive = location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex h-12 w-12 items-center justify-center rounded-3xl transition-all ${isActive ? "bg-purple-600 text-white shadow-lg" : "hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800"}`}
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-gray-200 bg-white/95 px-3 py-2 shadow-inner backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 lg:hidden">
        {navItems.map(({ href, Icon, label }) => {
          const isActive = location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] transition ${isActive ? "text-purple-600" : "text-gray-500 hover:text-purple-600 dark:text-gray-400"}`}
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
