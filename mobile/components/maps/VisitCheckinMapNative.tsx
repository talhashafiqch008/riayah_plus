import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { ROLE } from '../shell/RoleChrome';
import type { MapCoord, VisitCheckinMapProps } from './visitMapTypes';

const DEFAULT_DELTA = 0.018;

function regionFor(points: MapCoord[]): Region {
  if (points.length === 0) {
    return { latitude: 0, longitude: 0, latitudeDelta: 40, longitudeDelta: 40 };
  }
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
  }

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latDelta = Math.max((maxLat - minLat) * 1.8, 0.008);
  const lngDelta = Math.max((maxLng - minLng) * 1.8, 0.008);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export function VisitCheckinMapNative({
  destination,
  destinationLabel = 'Patient',
  you,
  youLabel = 'You',
  radiusMeters,
  address,
}: VisitCheckinMapProps) {
  const mapRef = useRef<MapView>(null);
  const points = useMemo(
    () => [destination, you].filter((p): p is MapCoord => Boolean(p)),
    [destination, you],
  );
  const region = useMemo(() => regionFor(points), [points]);

  useEffect(() => {
    if (points.length === 0) return;
    const id = requestAnimationFrame(() => {
      if (points.length === 1) {
        mapRef.current?.animateToRegion(region, 350);
        return;
      }
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 56, right: 40, bottom: 52, left: 40 },
        animated: true,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [points, region]);

  if (points.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="map-outline" size={28} color={ROLE.stone400} />
        <Text style={styles.placeholderText}>Waiting for GPS…</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {destination && radiusMeters && radiusMeters > 0 ? (
          <Circle
            center={destination}
            radius={radiusMeters}
            strokeColor="rgba(13, 148, 136, 0.55)"
            strokeWidth={2}
            fillColor="rgba(13, 148, 136, 0.12)"
          />
        ) : null}

        {destination && you ? (
          <Polyline
            coordinates={[you, destination]}
            strokeColor={ROLE.teal}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        ) : null}

        {destination ? (
          <Marker
            coordinate={destination}
            title={destinationLabel}
            description={address ?? undefined}
            pinColor={ROLE.teal}
          />
        ) : null}

        {you ? (
          <Marker coordinate={you} title={youLabel} pinColor={ROLE.amber} />
        ) : null}
      </MapView>

      {address ? (
        <View style={styles.addressChip} pointerEvents="none">
          <Ionicons name="location" size={14} color={ROLE.tealDark} />
          <Text style={styles.addressText} numberOfLines={2}>
            {address}
          </Text>
        </View>
      ) : null}

      <View style={styles.legend} pointerEvents="none">
        {you ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ROLE.amber }]} />
            <Text style={styles.legendLabel}>{youLabel}</Text>
          </View>
        ) : null}
        {destination ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ROLE.teal }]} />
            <Text style={styles.legendLabel}>{destinationLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 268,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: ROLE.stone100,
  },
  placeholder: {
    height: 268,
    borderRadius: 16,
    backgroundColor: ROLE.stone100,
    borderWidth: 1,
    borderColor: ROLE.stone200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: ROLE.stone500,
  },
  addressChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: ROLE.stone200,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: ROLE.stone900,
  },
  legend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: ROLE.stone200,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ROLE.stone900,
  },
});
