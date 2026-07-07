import * as React from "react"
import { cn } from "@/lib/utils"

export interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
 variant?: "default" | "elevated" | "flat" | "interactive"
 padding?: "none" | "sm" | "md" | "lg"
}

const BaseCard = React.forwardRef<HTMLDivElement, BaseCardProps>(
 ({ className, variant = "default", padding = "md", ...props }, ref) => {
 const baseStyles = "bg-[var(--color-surface)] border border-[var(--color-border)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-cubic)]"
 
 const variants = {
 default: "rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]",
 elevated: "rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)]",
 flat: "rounded-[var(--radius-md)] shadow-none border-[var(--color-border-light)]",
 interactive: "rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:border-[var(--color-primary-light)] cursor-pointer hover:-translate-y-0.5",
 }
 
 const paddings = {
 none: "",
 sm: "p-3",
 md: "p-5",
 lg: "p-6",
 }
 
 return (
 <div
 ref={ref}
 className={cn(baseStyles, variants[variant], paddings[padding], className)}
 {...props}
 />
 )
 }
)
BaseCard.displayName = "BaseCard"

export { BaseCard }