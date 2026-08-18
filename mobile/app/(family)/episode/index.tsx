import { Redirect } from 'expo-router';

/** Superseded by the care journey list at /(family)/episodes. */
export default function LegacyEpisodeScreen() {
  return <Redirect href="/(family)/episodes" />;
}
