import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Card({
  children,
  className = "",
  as: Component = "div",
  ...props
}: CardProps) {
  return (
    <Component
      className={`rounded-xl border border-line bg-surface p-6 shadow-xs ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
