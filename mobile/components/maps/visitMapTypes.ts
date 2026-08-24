export interface MapCoord {
  latitude: number;
  longitude: number;
}

export interface VisitCheckinMapProps {
  destination: MapCoord | null;
  destinationLabel?: string;
  you: MapCoord | null;
  youLabel?: string;
  radiusMeters?: number | null;
  address?: string | null;
}
