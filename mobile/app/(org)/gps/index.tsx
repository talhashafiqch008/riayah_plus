import { GpsMonitorScreen } from '../../../components/gps/GpsMonitorScreen';

export default function OrgGpsScreen() {
  return <GpsMonitorScreen visitHref={(id) => `/(org)/gps/${id}`} i18nNs="org" />;
}
