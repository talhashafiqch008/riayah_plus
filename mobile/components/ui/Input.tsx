import { useState, type ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="w-full">
      {label ? <Text className="mb-1 text-sm text-stone-700">{label}</Text> : null}
      <View
        className={`flex-row items-center rounded-xl border bg-white px-3 ${
          error ? 'border-red-500' : focused ? 'border-teal-500' : 'border-stone-300'
        }`}
      >
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          className={`flex-1 py-2.5 text-base text-stone-900 ${className}`}
          placeholderTextColor="#A8A29E"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>
      {error ? <Text className="mt-1 text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
