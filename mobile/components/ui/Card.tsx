import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  shadow?: boolean;
}

export function Card({ children, className = '', onPress, shadow = true, ...rest }: CardProps) {
  const body = (
    <View
      className={`rounded-2xl bg-white p-4 ${className}`}
      style={
        shadow
          ? {
              shadowColor: '#1C1917',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }
  return body;
}
