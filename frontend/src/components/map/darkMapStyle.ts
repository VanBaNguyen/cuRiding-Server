/** Google Maps style tuned for the Raven Cockpit dark UI. */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#151518' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A8A93' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0B0D' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2A2A30' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5A5A63' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1A1A1E' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#242428' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2A2A30' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2E2E34' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#3A3A42' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1E1E22' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0E1218' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4A5568' }] },
];

export const MAP_EDGE_PADDING = { top: 130, right: 56, bottom: 200, left: 56 };
