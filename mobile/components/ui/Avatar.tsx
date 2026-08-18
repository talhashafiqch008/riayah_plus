import { Image, Text, View } from 'react-native';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<Size, number> = { sm: 32, md: 40, lg: 48, xl: 64 };

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: Size;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const dim = SIZE_PX[size];
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: dim, height: dim, borderRadius: dim / 2 }}
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View
      className="items-center justify-center bg-teal-50"
      style={{ width: dim, height: dim, borderRadius: dim / 2 }}
    >
      <Text className="font-semibold text-teal-700" style={{ fontSize: dim * 0.35 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
