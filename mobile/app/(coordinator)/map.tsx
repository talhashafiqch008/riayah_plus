import { GpsMonitorScreen } from '../../components/gps/GpsMonitorScreen';

export default function CoordinatorMapScreen() {
  return <GpsMonitorScreen visitHref={(id) => `/(coordinator)/gps/${id}`} />;
}
