import { Redirect } from 'expo-router';

/** Assessments are coordinator/clinical only — family uses care sessions instead. */
export default function EpisodeAssessmentsScreen() {
  return <Redirect href="/(family)/bookings" />;
}
