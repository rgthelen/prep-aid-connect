import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Emergency {
  id: string;
  title: string;
  emergency_type: string;
  description: string | null;
  zipcode: string;
  state: string;
  radius_miles: number;
  is_active: boolean;
  created_at: string;
}

interface EmergencyMapViewProps {
  emergencies: Emergency[];
  userLocation?: { zipcode: string; state: string };
  height?: string;
}

export const EmergencyMapView = ({ 
  emergencies, 
  userLocation, 
  height = '400px' 
}: EmergencyMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Get Mapbox token from environment or use a placeholder
    const mapboxToken = 'pk.eyJ1IjoidGVzdCIsImEiOiJjazl3cHNhbGYwMDFrM29xbGR6emt2M3VzIn0.test';
    
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-95.7129, 37.0902], // Center of US
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      loadEmergencies();
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      loadEmergencies();
    }
  }, [emergencies]);

  const loadEmergencies = () => {
    if (!map.current) return;

    // Clear existing emergency layers
    if (map.current.getLayer('emergency-areas-fill')) {
      map.current.removeLayer('emergency-areas-fill');
    }
    if (map.current.getLayer('emergency-areas-outline')) {
      map.current.removeLayer('emergency-areas-outline');
    }
    if (map.current.getSource('emergency-areas')) {
      map.current.removeSource('emergency-areas');
    }

    if (emergencies.length === 0) return;

    // Create GeoJSON for emergency areas
    const features = emergencies.map((emergency, index) => {
      // For now, create placeholder coordinates based on index
      // In production, you'd geocode the zipcode/state
      const center = [-95 + (index * 2), 37 + (index * 1)];
      const radiusInKm = emergency.radius_miles * 1.60934;
      
      // Create a simple circle approximation
      const points = [];
      const steps = 64;
      for (let i = 0; i < steps; i++) {
        const angle = (i * 360) / steps;
        const lat = center[1] + (radiusInKm / 111) * Math.cos((angle * Math.PI) / 180);
        const lng = center[0] + (radiusInKm / (111 * Math.cos((center[1] * Math.PI) / 180))) * Math.sin((angle * Math.PI) / 180);
        points.push([lng, lat]);
      }
      points.push(points[0]); // Close the polygon

      return {
        type: 'Feature' as const,
        properties: {
          id: emergency.id,
          title: emergency.title,
          emergency_type: emergency.emergency_type,
          description: emergency.description,
          is_active: emergency.is_active,
          radius_miles: emergency.radius_miles,
          zipcode: emergency.zipcode,
          state: emergency.state,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [points],
        },
      };
    });

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features,
    };

    // Add emergency areas source
    map.current.addSource('emergency-areas', {
      type: 'geojson',
      data: geojsonData,
    });

    // Add fill layer for emergency areas
    map.current.addLayer({
      id: 'emergency-areas-fill',
      type: 'fill',
      source: 'emergency-areas',
      paint: {
        'fill-color': [
          'case',
          ['get', 'is_active'],
          '#ef4444', // Red for active emergencies
          '#6b7280'  // Gray for inactive emergencies
        ],
        'fill-opacity': 0.3,
      },
    });

    // Add outline layer for emergency areas
    map.current.addLayer({
      id: 'emergency-areas-outline',
      type: 'line',
      source: 'emergency-areas',
      paint: {
        'line-color': [
          'case',
          ['get', 'is_active'],
          '#dc2626', // Darker red for active emergencies
          '#4b5563'  // Darker gray for inactive emergencies
        ],
        'line-width': 2,
      },
    });

    // Add click handlers for popups
    map.current.on('click', 'emergency-areas-fill', (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const properties = feature.properties;
      
      if (!properties) return;

      const popup = new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-3 max-w-xs">
            <h3 class="font-semibold text-sm mb-1">${properties.title}</h3>
            <div class="space-y-1 text-xs text-gray-600">
              <p><strong>Type:</strong> ${properties.emergency_type}</p>
              <p><strong>Location:</strong> ${properties.zipcode}, ${properties.state}</p>
              <p><strong>Radius:</strong> ${properties.radius_miles} miles</p>
              <p><strong>Status:</strong> <span class="${properties.is_active ? 'text-red-600' : 'text-gray-500'}">${properties.is_active ? 'Active' : 'Inactive'}</span></p>
              ${properties.description ? `<p><strong>Description:</strong> ${properties.description}</p>` : ''}
            </div>
          </div>
        `)
        .addTo(map.current!);
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'emergency-areas-fill', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'emergency-areas-fill', () => {
      map.current!.getCanvas().style.cursor = '';
    });

    // Fit map to show all emergencies
    if (features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates[0].forEach(coord => {
            bounds.extend(coord as [number, number]);
          });
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  };

  return (
    <div 
      ref={mapContainer} 
      className="w-full rounded-lg shadow-sm border"
      style={{ height }}
    />
  );
};