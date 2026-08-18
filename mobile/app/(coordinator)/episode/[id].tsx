import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CoordinatorEpisodeAliasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/(coordinator)/episodes" />;
  return <Redirect href={`/(coordinator)/episodes/${id}`} />;
}
