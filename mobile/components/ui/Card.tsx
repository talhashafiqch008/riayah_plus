import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const PRESS_SPRING = { mass: 0.5, stiffness: 400, damping: 20 };
const RELEASE_SPRING = { mass: 0.5, stiffness: 250, damping: 18 };

interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  shadow?: boolean;
}

export function Card({ children, className = '', onPress, shadow = true, ...rest }: CardProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const body = (
    <View
      className={`rounded-2xl bg-white p-4 ${className}`}
      style={
        shadow
          ? {
              borderWidth: 1,
              borderColor: '#E7E5E4',
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
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!reduceMotion) scale.value = withSpring(0.97, PRESS_SPRING);
          }}
          onPressOut={() => {
            if (!reduceMotion) scale.value = withSpring(1, RELEASE_SPRING);
          }}
          accessibilityRole="button"
        >
          {body}
        </Pressable>
      </Animated.View>
    );
  }
  return body;
}
