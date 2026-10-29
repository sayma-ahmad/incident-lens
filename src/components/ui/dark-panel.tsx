import React from "react";
import { IconCircle, type IconType } from "./icon-circle";

export interface DarkPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  children?: React.ReactNode;
  icon?: IconType;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

export function DarkPanel({
  children,
  icon,
  title,
  description,
  className = "",
  ...props
}: DarkPanelProps) {
  return (
    <div
      className={`rounded-xl bg-panel p-6 text-on-panel border border-panel shadow-sm ${className}`}
      {...props}
    >
      {(icon || title || description) && (
        <div className="flex items-start gap-4">
          {icon && <IconCircle icon={icon} />}
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-bold text-on-panel tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-on-panel-muted leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
      {children && (
        <div className={icon || title || description ? "mt-4" : ""}>
          {children}
        </div>
      )}
    </div>
  );
}
