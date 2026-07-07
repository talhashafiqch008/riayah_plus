
import { m, LazyMotion, domAnimation } from "framer-motion";

interface LogoProps {
 size?: "sm" | "md" | "lg" | "xl";
 showText?: boolean;
 animated?: boolean;
 className?: string;
}

/**
 * Raiyah Plus Official Logo
 * Uses the actual logo image provided
 */
export function Logo({ size = "md", showText = true, animated = true, className = "" }: LogoProps) {
 const sizes = {
 sm: { icon: 32, text: "text-base", arabic: "text-[8px]" },
 md: { icon: 44, text: "text-lg", arabic: "text-[10px]" },
 lg: { icon: 64, text: "text-2xl", arabic: "text-xs" },
 xl: { icon: 96, text: "text-3xl", arabic: "text-sm" },
 };

 const { icon, text, arabic } = sizes[size];

 const Wrapper = animated ? m.div : "div";
 const wrapperProps = animated
 ? {
 whileHover: { scale: 1.02 },
 whileTap: { scale: 0.98 },
 transition: { duration: 0.2 },
 }
 : {};

 return (
 <Wrapper
 className={`flex items-center gap-2 cursor-pointer ${className}`}
 {...wrapperProps}
 >
 {/* Logo Image */}
 <img
 src="/logo.png"
 alt="Raiyah Plus Logo"
 width={icon}
 height={icon}
 className="flex-shrink-0"
 style={{ width: 'auto', height: 'auto' }}
 />

 {/* Text */}
 {showText && (
 <div className="flex flex-col">
 <span
 className={`${text} font-bold bg-gradient-to-r from-sky-600 via-teal-500 to-lime-500 bg-clip-text text-transparent`}
 >
 Raiyah Plus
 </span>
 <span className={`${arabic} text-stone-400 -mt-0.5 font-medium`}>
 رعاية بلس
 </span>
 </div>
 )}
 </Wrapper>
 );
}

/**
 * Logo icon only (for favicons, small spaces)
 */
export function LogoIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
 return (
 <img
 src="/logo.png"
 alt="Raiyah Plus"
 width={size}
 height={size}
 className={`${className} object-contain`}
 />
 );
}

/**
 * Logo for dark backgrounds
 */
export function LogoLight({ size = "md", showText = true, className = "" }: LogoProps) {
 const sizes = {
 sm: { icon: 32, text: "text-base", arabic: "text-[8px]" },
 md: { icon: 44, text: "text-lg", arabic: "text-[10px]" },
 lg: { icon: 64, text: "text-2xl", arabic: "text-xs" },
 xl: { icon: 96, text: "text-3xl", arabic: "text-sm" },
 };

 const { icon, text, arabic } = sizes[size];

 return (
 <div className={`flex items-center gap-2 ${className}`}>
 <img
 src="/logo.png"
 alt="Raiyah Plus Logo"
 width={icon}
 height={icon}
 className="flex-shrink-0"
 />

 {showText && (
 <div className="flex flex-col">
 <span className={`${text} font-bold text-white`}>
 Raiyah Plus
 </span>
 <span className={`${arabic} text-white/60 -mt-0.5 font-medium`}>
 رعاية بلس
 </span>
 </div>
 )}
 </div>
 );
}

export default Logo;
