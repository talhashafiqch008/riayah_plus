import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-teal-600',
  secondary: 'bg-transparent border border-teal-600',
  ghost: 'bg-transparent',
  destructive: 'bg-red-600',
};

const textClass: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-teal-600',
  ghost: 'text-teal-600',
  destructive: 'text-white',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-10 px-3',
  md: 'h-12 px-4',
  lg: 'h-14 px-5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`items-center justify-center rounded-xl ${variantClass[variant]} ${sizeClass[size]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? '#0D9488' : '#fff'} />
      ) : typeof children === 'string' ? (
        <Text className={`text-base font-semibold ${textClass[variant]}`}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
