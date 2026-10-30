import React from "react";

export type IconType =
  | "bell"
  | "shield-person"
  | "link"
  | "layers"
  | "sparkle"
  | "ai"
  | "clock"
  | "chart"
  | "check";

interface IconCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: IconType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function renderSvgIcon(icon: IconType) {
  switch (icon) {
    case "bell":
      return (
        <svg className="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "shield-person":
      return (
        <svg className="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="9" r="2.5" />
          <path d="M8.5 15.5a3.5 3.5 0 0 1 7 0" />
        </svg>
      );
    case "link":
      return (
        <svg className="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case "layers":
      return (
        <svg className="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "sparkle":
    case "ai":
      return (
        <svg className="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
        </svg>
      );
    case "clock":
      return (
        <svg className="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "chart":
      return (
        <svg className="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "check":
      return (
        <svg className="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
  }
}

export function IconCircle({
  icon,
  size = "md",
  className = "",
  ...props
}: IconCircleProps) {
  const sizeClasses = {
    sm: "size-7 p-1.5",
    md: "size-10 p-2.5",
    lg: "size-12 p-3",
  }[size];

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-white ${sizeClasses} ${className}`}
      {...props}
    >
      {renderSvgIcon(icon)}
    </div>
  );
}
