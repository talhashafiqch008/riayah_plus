import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

export interface SmartInputProps
 extends React.InputHTMLAttributes<HTMLInputElement> {
 label?: string;
 helperText?: string;
 error?: string;
 leftIcon?: React.ReactNode;
 rightIcon?: React.ReactNode;
 isPassword?: boolean;
 fullWidth?: boolean;
}

const SmartInput = React.forwardRef<HTMLInputElement, SmartInputProps>(
 (
 {
 className,
 label,
 helperText,
 error,
 leftIcon,
 rightIcon,
 isPassword = false,
 fullWidth = true,
 type = "text",
 ...props
 },
 ref
 ) => {
 const [showPassword, setShowPassword] = React.useState(false);
 const inputType = isPassword ? (showPassword ? "text" : "password") : type;
 const hasError = !!error;

 return (
 <div className={cn("space-y-1.5", fullWidth && "w-full")}>
 {label && (
 <label
 className="block text-sm font-medium text-stone-700"
 htmlFor={props.id}
 >
 {label}
 {props.required && (
 <span className="text-red-500 ml-0.5">*</span>
 )}
 </label>
 )}
 <div className="relative">
 {leftIcon && (
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
 {leftIcon}
 </div>
 )}
 <input
 ref={ref}
 type={inputType}
 className={cn(
 "h-11 px-4 text-sm transition-all duration-200",
 "bg-white",
 "border-2 rounded-[var(--radius-md)]",
 "placeholder:text-stone-400",
 "text-stone-900",
 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
 "disabled:opacity-50 disabled:cursor-not-allowed",
 leftIcon && "pl-10",
 (rightIcon || isPassword) && "pr-10",
 hasError
 ? "border-red-300 focus:border-red-500 focus:ring-red-200"
 : "border-stone-200 hover:border-stone-300 focus:border-teal-500",
 fullWidth && "w-full",
 className
 )}
 aria-invalid={hasError}
 aria-describedby={
 hasError
 ? `${props.id}-error`
 : helperText
 ? `${props.id}-helper`
 : undefined
 }
 {...props}
 />
 {isPassword && (
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
 tabIndex={-1}
 aria-label={showPassword ? "Hide password" : "Show password"}
 >
 {showPassword ? (
 <EyeOff className="h-4 w-4" />
 ) : (
 <Eye className="h-4 w-4" />
 )}
 </button>
 )}
 {rightIcon && !isPassword && (
 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
 {rightIcon}
 </div>
 )}
 </div>
 {helperText && !hasError && (
 <p
 id={`${props.id}-helper`}
 className="text-xs text-stone-500"
 >
 {helperText}
 </p>
 )}
 {hasError && (
 <p
 id={`${props.id}-error`}
 className="text-xs text-red-600 font-medium"
 role="alert"
 >
 {error}
 </p>
 )}
 </div>
 );
 }
);
SmartInput.displayName = "SmartInput";

export { SmartInput };
