interface UchatLogoProps {
  size?: number;
  className?: string;
}

export function UchatLogoMark({ size = 40, className }: UchatLogoProps) {
  const gId = `ug-g-${size}`;
  const sId = `ug-s-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Uchat logo"
      role="img"
    >
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#1a1f2e" />
        </linearGradient>
        <linearGradient id={sId} x1="12" y1="17" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${gId})`} />
      <rect x="0.5" y="0.5" width="47" height="47" rx="12.5" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <path
        d="M15 17v12a9 9 0 0 0 18 0V17"
        stroke={`url(#${sId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="36.5" r="1.8" fill="#8B5CF6" opacity="0.7" />
    </svg>
  );
}

export function UchatWordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{ fontWeight: 700, letterSpacing: "0.12em", fontSize: "inherit" }}
    >
      Uchat
    </span>
  );
}
