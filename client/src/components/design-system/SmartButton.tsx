import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SmartButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
 size?: "sm" | "md" | "lg";
 isLoading?: boolean;
 loadingText?: string;
 leftIcon?: React.ReactNode;
 rightIcon?: React.ReactNode;
}

const SmartButton = React.forwardRef<HTMLButtonElement, SmartButtonProps>(
 (
 {
 className,
 variant = "primary",
 size = "md",
 isLoading = false,
 loadingText,
 leftIcon,
 rightIcon,
 children,
 disabled,
 ...props
 },
 ref
 ) => {
 const variants = {
 primary:
 "bg-teal-600 hover:bg-teal-700 text-white shadow-[0_4px_12px_-2px_rgba(13,148,136,0.25)] hover:shadow-[0_8px_24px_-4px_rgba(13,148,136,0.35)] active:shadow-none",
 secondary:
 "bg-stone-100 hover:bg-stone-200 text-stone-900",
 outline:
 "border-2 border-stone-300 hover:border-teal-500 text-stone-700 hover:text-teal-700 bg-transparent",
 ghost:
 "text-stone-600 hover:text-stone-900 hover:bg-stone-100",
 danger:
 "bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_12px_-2px_rgba(239,68,68,0.25)]",
 success:
 "bg-green-500 hover:bg-green-600 text-white shadow-[0_4px_12px_-2px_rgba(34,197,94,0.25)]",
 };

 const sizes = {
 sm: "h-9 px-3 text-sm rounded-[var(--radius-sm)]",
 md: "h-11 px-5 text-sm font-medium rounded-[var(--radius-md)]",
 lg: "h-13 px-6 text-base font-medium rounded-[var(--radius-lg)]",
 };

 return (
 <button
 ref={ref}
 className={cn(
 "inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out",
 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
 "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0",
 "active:scale-[0.98]",
 variants[variant],
 sizes[size],
 className
 )}
 disabled={disabled || isLoading}
 {...props}
 >
 {isLoading ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 {loadingText || children}
 </>
 ) : (
 <>
 {leftIcon}
 {children}
 {rightIcon}
 </>
 )}
 </button>
 );
 }
);
SmartButton.displayName = "SmartButton";

export { SmartButton };
