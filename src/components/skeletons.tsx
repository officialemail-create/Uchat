import type { HTMLAttributes } from "react";

type SkeletonRowProps = HTMLAttributes<HTMLDivElement> & {
  type?: "user";
  searching?: boolean;
};

export function SkeletonRow({ searching = false, className = "", ...props }: SkeletonRowProps) {
  return (
    <div
      className={`flex h-20 items-center gap-4 border-l-4 border-transparent px-4 ${className}`}
      aria-hidden="true"
      {...props}
    >
      <div className="skeleton-shimmer h-12 w-12 shrink-0 rounded-full border-2 border-[#8B5CF6]/30" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="skeleton-shimmer h-3.5 w-32 rounded-full" />
          <div className="skeleton-shimmer h-2.5 w-10 rounded-full" />
        </div>
        <div className="skeleton-shimmer h-3 w-44 max-w-[70%] rounded-full" />
      </div>
      {searching ? <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#8B5CF6]" /> : null}
    </div>
  );
}

export function SkeletonBubble({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex min-h-[52px] w-full items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`} aria-hidden="true">
      {!isOwn ? <div className="skeleton-shimmer h-7 w-7 shrink-0 rounded-full" /> : null}
      <div className={`skeleton-shimmer h-11 rounded-2xl ${isOwn ? "w-44 rounded-br-md" : "w-56 rounded-bl-md"}`} />
    </div>
  );
}

export function SkeletonRows({ count = 4, searching = false }: { count?: number; searching?: boolean }) {
  return (
    <div className="divide-y divide-[#363636]/70" aria-label={searching ? "Searching" : "Loading conversations"}>
      {Array.from({ length: count }, (_, index) => <SkeletonRow key={index} searching={searching} />)}
    </div>
  );
}