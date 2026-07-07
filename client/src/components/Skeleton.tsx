function Skeleton({
 className,
 ...props
}: React.HTMLAttributes<HTMLDivElement>) {
 // Simple shimmer effect using tailwind animate-pulse
 return (
 <div
 className={`animate-pulse rounded-md bg-stone-200/80 ${className || ''}`}
 {...props}
 />
 )
}

export { Skeleton }
