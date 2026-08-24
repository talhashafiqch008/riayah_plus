// Redirect legacy staff telehealth stub to clinical route shape.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function StaffTelehealthRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/(clinical)/telehealth/${id}` as never} />;
}
