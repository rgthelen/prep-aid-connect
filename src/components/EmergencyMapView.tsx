import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import * as turf from '@turf/turf';

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
  latitude?: number;
  longitude?: number;
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
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      try {
        // Fetch Mapbox token from edge function
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        
        if (tokenError) {
          console.error('Error fetching Mapbox token:', tokenError);
          return;
        }

        const token = tokenData?.token;
        if (!token) {
          console.error('No Mapbox token received');
          return;
        }

        setMapboxToken(token);
        mapboxgl.accessToken = token;
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-95.7129, 37.0902], // Center of US
          zoom: 4,
          touchZoomRotate: true,
          touchPitch: false,
          dragRotate: false,
          pitchWithRotate: false,
        });

        // Add controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geolocate control
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: false,
          showUserHeading: false
        });
        map.current.addControl(geolocate, 'top-right');

        map.current.on('load', () => {
          loadEmergencies();
        });

        // Handle zoom to maintain consistent appearance
        map.current.on('zoom', () => {
          updateLayerScaling();
        });

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      loadEmergencies();
    }
  }, [emergencies]);

  const updateLayerScaling = () => {
    if (!map.current) return;
    
    const zoom = map.current.getZoom();
    
    // Update symbol sizes based on zoom
    if (map.current.getLayer('emergency-areas-symbols')) {
      map.current.setPaintProperty('emergency-areas-symbols', 'circle-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        4, 4,
        10, 6,
        16, 8
      ]);
    }

    // Update line widths based on zoom
    if (map.current.getLayer('emergency-areas-outline')) {
      map.current.setPaintProperty('emergency-areas-outline', 'line-width', [
        'interpolate',
        ['linear'],
        ['zoom'],
        4, 1,
        10, 2,
        16, 3
      ]);
    }
  };

  const geocodeLocation = async (zipcode: string, state: string): Promise<{ lat: number; lng: number } | null> => {
    if (!mapboxToken) return null;
    
    try {
      const query = `${zipcode}, ${state}, USA`;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=US&types=postcode,place&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          return { lat, lng };
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const loadEmergencies = async () => {
    if (!map.current || emergencies.length === 0) return;

    // Clear existing emergency layers
    ['emergency-areas-fill', 'emergency-areas-outline', 'emergency-areas-symbols'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    if (map.current.getSource('emergency-areas')) {
      map.current.removeSource('emergency-areas');
    }

    const features = [];
    const bounds = new mapboxgl.LngLatBounds();
    
    // Process emergencies and create GeoJSON features
    for (const emergency of emergencies) {
      let lat, lng;
      
      // Use stored coordinates if available, otherwise geocode
      if (emergency.latitude && emergency.longitude) {
        lat = emergency.latitude;
        lng = emergency.longitude;
      } else if (emergency.zipcode && emergency.state) {
        const coords = await geocodeLocation(emergency.zipcode, emergency.state);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        } else {
          // Skip if we can't determine location
          continue;
        }
      } else {
        // Skip if no location data
        continue;
      }

      // Create circle feature for the emergency area
      const radiusInKm = emergency.radius_miles * 1.60934;
      const circle = turf.circle([lng, lat], radiusInKm, { steps: 64 });
      
      features.push({
        ...circle,
        properties: {
          ...circle.properties,
          id: emergency.id,
          title: emergency.title,
          emergency_type: emergency.emergency_type,
          description: emergency.description,
          is_active: emergency.is_active,
          radius_miles: emergency.radius_miles,
          zipcode: emergency.zipcode,
          state: emergency.state,
          center_lat: lat,
          center_lng: lng,
          created_at: emergency.created_at,
        },
      });

      // Extend bounds to include this emergency
      bounds.extend([lng, lat]);
    }

    if (features.length === 0) return;

    // Add source for emergency areas
    map.current.addSource('emergency-areas', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
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
        'fill-opacity': 0.2,
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
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 1,
          10, 2,
          16, 3
        ],
      },
    });

    // Add center point symbols
    map.current.addLayer({
      id: 'emergency-areas-symbols',
      type: 'circle',
      source: 'emergency-areas',
      paint: {
        'circle-color': [
          'case',
          ['get', 'is_active'],
          '#dc2626',
          '#4b5563'
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 4,
          10, 6,
          16, 8
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Add click handlers for popups
    ['emergency-areas-fill', 'emergency-areas-symbols'].forEach(layerId => {
      map.current?.on('click', layerId, (e) => {
        if (!e.features || e.features.length === 0) return;
        
        const feature = e.features[0];
        const properties = feature.properties;
        
        if (!properties) return;

        const emergencyTypeColor = getEmergencyTypeColor(properties.emergency_type);
        const statusColor = properties.is_active ? '#dc2626' : '#6b7280';

        const popup = new mapboxgl.Popup({
          maxWidth: '300px',
          className: 'emergency-popup'
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-3">
              <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-sm pr-2">${properties.title}</h3>
                <span class="text-xs px-2 py-1 rounded-full whitespace-nowrap" style="background-color: ${emergencyTypeColor}; color: white;">
                  ${properties.emergency_type}
                </span>
              </div>
              <div class="space-y-1 text-xs text-gray-600">
                <p><span class="font-medium text-gray-800">Location:</span> ${properties.zipcode}, ${properties.state}</p>
                <p><span class="font-medium text-gray-800">Radius:</span> ${properties.radius_miles} miles</p>
                <p><span class="font-medium text-gray-800">Status:</span> 
                  <span style="color: ${statusColor}; font-weight: 500;">
                    ${properties.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p><span class="font-medium text-gray-800">Created:</span> ${new Date(properties.created_at).toLocaleDateString()}</p>
                ${properties.description ? `<p class="mt-2 text-xs"><span class="font-medium text-gray-800">Details:</span> ${properties.description}</p>` : ''}
              </div>
            </div>
          `)
          .addTo(map.current!);
      });

      // Change cursor on hover
      map.current?.on('mouseenter', layerId, () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current?.on('mouseleave', layerId, () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });

    // Add user location if provided
    if (userLocation) {
      const userCoords = await geocodeLocation(userLocation.zipcode, userLocation.state);
      if (userCoords) {
        // Add user location marker
        new mapboxgl.Marker({
          color: '#3b82f6',
          scale: 0.8
        })
          .setLngLat([userCoords.lng, userCoords.lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(`
              <div class="p-2">
                <h4 class="font-medium text-sm text-blue-600">Your Location</h4>
                <p class="text-xs text-gray-600">${userLocation.zipcode}, ${userLocation.state}</p>
              </div>
            `)
          )
          .addTo(map.current);

        bounds.extend([userCoords.lng, userCoords.lat]);
      }
    }

    // Fit map to show all features
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { 
        padding: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        },
        maxZoom: 10
      });
    }
  };

  const getEmergencyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fire: '#dc2626',
      wildfire: '#dc2626',
      flood: '#2563eb',
      hurricane: '#7c3aed',
      tornado: '#6b7280',
      earthquake: '#ea580c',
      blizzard: '#0891b2',
      storm: '#7c3aed',
      other: '#6b7280',
    };
    return colors[type.toLowerCase()] || '#6b7280';
  };

  return (
    <div className="relative">
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg shadow-sm border"
        style={{ height }}
      />
      <style>{`
        .emergency-popup .mapboxgl-popup-content {
          padding: 0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .emergency-popup .mapboxgl-popup-tip {
          border-top-color: white;
        }
      `}</style>
    </div>
  );
};