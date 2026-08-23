import { useEffect, useState } from "react";

import defaultAvatar from "@/assets/default-avatar.svg";
import { cn } from "@/lib/utils";

type UserAvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-14 w-14",
  "2xl": "h-20 w-20",
};

export function UserAvatar({
  src,
  alt = "User avatar",
  size = "md",
  className,
  ...props
}: {
  src?: string | null;
  alt?: string;
  size?: UserAvatarSize;
  className?: string;
  [key: string]: unknown;
}) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = typeof src === "string" ? src.trim() : "";

  useEffect(() => {
    setHasError(false);
  }, [normalizedSrc]);

  const finalSrc = hasError || !normalizedSrc ? defaultAvatar : normalizedSrc;

  return (
    <img
      {...props}
      src={finalSrc}
      alt={alt}
      className={cn("rounded-full object-cover", sizeClasses[size], className)}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}
