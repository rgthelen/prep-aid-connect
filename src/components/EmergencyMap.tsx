import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Circle, Square, Save, X, Crosshair } from 'lucide-react';

interface EmergencyMapProps {
  onEmergencyCreated?: () => void;
  existingEmergencies?: Array<{
    id: string;
    title: string;
    emergency_type: string;
    zipcode: string;
    state: string;
    radius_miles: number;
    is_active: boolean;
    latitude?: number;
    longitude?: number;
  }>;
}

export const EmergencyMap = ({ onEmergencyCreated, existingEmergencies }: EmergencyMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoder = useRef<MapboxGeocoder | null>(null);
  const [drawingMode, setDrawingMode] = useState<'circle' | 'polygon' | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    emergency_type: '',
    description: '',
    radius_miles: 10,
  });
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      try {
        // Get Mapbox token from edge function
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        
        if (tokenError) {
          console.error('Error fetching Mapbox token:', tokenError);
          throw tokenError;
        }

        const mapboxToken = tokenData?.token;
        if (!mapboxToken) {
          throw new Error('No Mapbox token received');
        }

        mapboxgl.accessToken = mapboxToken;
    
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-95.7129, 37.0902], // Center of US
          zoom: 4,
          touchZoomRotate: true,
          touchPitch: false,
          dragRotate: false,
          pitchWithRotate: false,
        });

        // Set initial cursor style
        map.current.getCanvas().style.cursor = 'grab';

        // Add geocoder for search
        geocoder.current = new MapboxGeocoder({
          accessToken: mapboxToken,
          mapboxgl: mapboxgl,
          placeholder: 'Search for places, addresses, or zip codes',
          bbox: [-125.0011, 20.7197, -66.9326, 49.5904], // US bounding box
          countries: 'us',
        });

        map.current.addControl(geocoder.current, 'top-left');
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geolocate control
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        });
        map.current.addControl(geolocate, 'top-right');

        // Load existing emergencies
        map.current.on('load', () => {
          loadExistingEmergencies();
          setupDrawingHandlers();
        });

        // Handle zoom to maintain circle sizes
        map.current.on('zoom', () => {
          updateCircleScaling();
        });

      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: "Error",
          description: "Failed to initialize map. Please check your configuration.",
          variant: "destructive",
        });
      }
    };

    initializeMap();

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      loadExistingEmergencies();
    }
  }, [existingEmergencies]);

  const updateCircleScaling = () => {
    if (!map.current) return;
    
    // Update circle radius based on zoom level to maintain consistent size
    const zoom = map.current.getZoom();
    const baseRadius = 2;
    const scaledRadius = baseRadius * Math.pow(2, (4 - zoom) * 0.5);
    
    if (map.current.getLayer('emergency-areas-symbols')) {
      map.current.setPaintProperty('emergency-areas-symbols', 'circle-radius', scaledRadius);
    }
  };

  const geocodeLocation = async (zipcode: string, state: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
      const mapboxToken = tokenData?.token;
      
      if (!mapboxToken) return null;

      const query = `${zipcode}, ${state}, USA`;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=US&types=postcode,place`
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

  const reverseGeocode = async (lat: number, lng: number): Promise<{ zipcode: string; state: string } | null> => {
    try {
      const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
      const mapboxToken = tokenData?.token;
      
      if (!mapboxToken) return null;

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=postcode,place&country=US`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const context = feature.context || [];
          
          let zipcode = '';
          let state = '';
          
          // Extract zipcode from the feature itself or context
          if (feature.place_type?.includes('postcode')) {
            zipcode = feature.text;
          } else {
            const postcodeContext = context.find((c: any) => c.id.startsWith('postcode'));
            zipcode = postcodeContext?.text || '00000';
          }
          
          // Extract state
          const stateContext = context.find((c: any) => c.id.startsWith('region'));
          state = stateContext?.short_code?.replace('US-', '') || 'US';
          
          return { zipcode, state };
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return { zipcode: '00000', state: 'US' };
  };

  const loadExistingEmergencies = async () => {
    if (!map.current || !existingEmergencies) return;

    // Clear existing layers
    ['emergency-areas-fill', 'emergency-areas-outline', 'emergency-areas-symbols'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    if (map.current.getSource('emergency-areas')) {
      map.current.removeSource('emergency-areas');
    }

    const features = [];
    const markerPromises = existingEmergencies.map(async (emergency) => {
      let lat, lng;
      
      // Use stored coordinates if available, otherwise geocode
      if (emergency.latitude && emergency.longitude) {
        lat = emergency.latitude;
        lng = emergency.longitude;
      } else {
        const coords = await geocodeLocation(emergency.zipcode, emergency.state);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        } else {
          // Fallback to center of US with slight offset
          lat = 37.0902;
          lng = -95.7129;
        }
      }

      // Create circle feature
      const radiusInKm = emergency.radius_miles * 1.60934;
      const circle = turf.circle([lng, lat], radiusInKm, { steps: 64 });
      
      features.push({
        ...circle,
        properties: {
          ...circle.properties,
          id: emergency.id,
          title: emergency.title,
          emergency_type: emergency.emergency_type,
          is_active: emergency.is_active,
          radius_miles: emergency.radius_miles,
          zipcode: emergency.zipcode,
          state: emergency.state,
          center_lat: lat,
          center_lng: lng,
        },
      });

      return { emergency, lat, lng };
    });

    await Promise.all(markerPromises);

    if (features.length > 0) {
      // Add source and layers for emergency areas
      map.current.addSource('emergency-areas', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
      });

      // Add fill layer
      map.current.addLayer({
        id: 'emergency-areas-fill',
        type: 'fill',
        source: 'emergency-areas',
        paint: {
          'fill-color': [
            'case',
            ['get', 'is_active'],
            '#ef4444', // Red for active
            '#6b7280'  // Gray for inactive
          ],
          'fill-opacity': 0.2,
        },
      });

      // Add outline layer
      map.current.addLayer({
        id: 'emergency-areas-outline',
        type: 'line',
        source: 'emergency-areas',
        paint: {
          'line-color': [
            'case',
            ['get', 'is_active'],
            '#dc2626', // Darker red for active
            '#4b5563'  // Darker gray for inactive
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
            4, 3,
            10, 5,
            16, 7
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Add click handlers
      ['emergency-areas-fill', 'emergency-areas-symbols'].forEach(layerId => {
        map.current?.on('click', layerId, (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          const props = feature.properties;
          
          if (!props) return;

          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-3 max-w-xs">
                <h3 class="font-semibold text-sm mb-2">${props.title}</h3>
                <div class="space-y-1 text-xs">
                  <p><span class="font-medium">Type:</span> ${props.emergency_type}</p>
                  <p><span class="font-medium">Location:</span> ${props.zipcode}, ${props.state}</p>
                  <p><span class="font-medium">Radius:</span> ${props.radius_miles} miles</p>
                  <p><span class="font-medium">Status:</span> 
                    <span class="${props.is_active ? 'text-red-600 font-medium' : 'text-gray-500'}">${props.is_active ? 'Active' : 'Inactive'}</span>
                  </p>
                </div>
              </div>
            `)
            .addTo(map.current!);
        });

        // Change cursor on hover
        map.current?.on('mouseenter', layerId, () => {
          if (!drawingMode) {
            map.current!.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current?.on('mouseleave', layerId, () => {
          if (!drawingMode) {
            map.current!.getCanvas().style.cursor = 'grab';
          }
        });
      });

      // Fit bounds to show all emergencies
      const bounds = new mapboxgl.LngLatBounds();
      features.forEach(feature => {
        if (feature.properties?.center_lng && feature.properties?.center_lat) {
          bounds.extend([feature.properties.center_lng, feature.properties.center_lat]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 });
      }
    }
  };

  const setupDrawingHandlers = () => {
    if (!map.current) return;

    map.current.on('click', (e) => {
      if (drawingMode === 'circle') {
        createCircleArea(e.lngLat);
      }
    });

    map.current.on('mouseenter', () => {
      if (drawingMode === 'circle') {
        map.current!.getCanvas().style.cursor = 'crosshair';
      }
    });

    map.current.on('mouseleave', () => {
      if (!drawingMode) {
        map.current!.getCanvas().style.cursor = 'grab';
      }
    });
  };

  const createCircleArea = async (center: mapboxgl.LngLat) => {
    if (!map.current) return;

    const radiusInKm = formData.radius_miles * 1.60934;
    const circle = turf.circle([center.lng, center.lat], radiusInKm, { steps: 64 });
    
    const sourceId = 'emergency-area-draft';
    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(circle);
    } else {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: circle
      });

      map.current.addLayer({
        id: 'emergency-area-draft-fill',
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.3
        }
      });

      map.current.addLayer({
        id: 'emergency-area-draft-outline',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
          'line-dasharray': [2, 2]
        }
      });

      // Add center point
      map.current.addLayer({
        id: 'emergency-area-draft-center',
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-color': '#ef4444',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }
      });
    }

    // Get location info via reverse geocoding
    const locationInfo = await reverseGeocode(center.lat, center.lng);
    
    setCurrentDrawing({
      type: 'circle',
      center: [center.lng, center.lat],
      radius_miles: formData.radius_miles,
      geometry: circle,
      locationInfo
    });
    setCurrentLocation({ lat: center.lat, lng: center.lng });
    setShowForm(true);
  };

  const clearDrawing = () => {
    if (!map.current) return;
    
    const sourceId = 'emergency-area-draft';
    ['emergency-area-draft-fill', 'emergency-area-draft-outline', 'emergency-area-draft-center'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }
    
    setCurrentDrawing(null);
    setCurrentLocation(null);
    setShowForm(false);
    setDrawingMode(null);
  };

  const handleSetDrawingMode = (mode: 'circle' | 'polygon' | null) => {
    setDrawingMode(mode);
    clearDrawing();
    
    if (map.current) {
      if (mode === 'circle') {
        map.current.getCanvas().style.cursor = 'crosshair';
      } else {
        map.current.getCanvas().style.cursor = 'grab';
      }
    }
  };

  const saveEmergency = async () => {
    if (!currentDrawing || !currentLocation) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (!profile) {
        throw new Error('User profile not found');
      }

      const locationInfo = currentDrawing.locationInfo || { zipcode: '00000', state: 'US' };

      const { error } = await supabase.from('emergencies').insert({
        title: formData.title,
        emergency_type: formData.emergency_type,
        description: formData.description,
        zipcode: locationInfo.zipcode,
        state: locationInfo.state,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        radius_miles: formData.radius_miles,
        declared_by: profile.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Emergency area created successfully",
      });

      clearDrawing();
      setFormData({ title: '', emergency_type: '', description: '', radius_miles: 10 });
      onEmergencyCreated?.();
    } catch (error) {
      console.error('Error creating emergency:', error);
      toast({
        title: "Error",
        description: "Failed to create emergency area",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-[600px] overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full rounded-lg" />
      
      {/* Drawing Controls */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <Card className="w-64 bg-background/95 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Emergency Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={drawingMode === 'circle' ? 'default' : 'outline'}
                onClick={() => handleSetDrawingMode(drawingMode === 'circle' ? null : 'circle')}
                className="flex-1"
              >
                <Circle className="h-4 w-4 mr-1" />
                Draw Area
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="radius">Radius (miles)</Label>
              <Input
                id="radius"
                type="number"
                value={formData.radius_miles}
                onChange={(e) => setFormData(prev => ({ ...prev, radius_miles: parseInt(e.target.value) || 10 }))}
                min="1"
                max="100"
                className="text-sm"
              />
            </div>

            {drawingMode && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                <Crosshair className="h-3 w-3 inline mr-1" />
                Click on the map to create an emergency area
              </div>
            )}

            {currentLocation && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                <MapPin className="h-3 w-3 inline mr-1" />
                Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emergency Form */}
      {showForm && (
        <div className="absolute bottom-4 left-4 z-10 max-w-[calc(100vw-2rem)] sm:max-w-80">
          <Card className="bg-background/95 backdrop-blur">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Create Emergency</CardTitle>
              <Button size="sm" variant="ghost" onClick={clearDrawing}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="title" className="text-xs">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Hurricane Warning"
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-xs">Emergency Type</Label>
                <Select 
                  value={formData.emergency_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, emergency_type: value }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hurricane">Hurricane</SelectItem>
                    <SelectItem value="tornado">Tornado</SelectItem>
                    <SelectItem value="flood">Flood</SelectItem>
                    <SelectItem value="wildfire">Wildfire</SelectItem>
                    <SelectItem value="earthquake">Earthquake</SelectItem>
                    <SelectItem value="blizzard">Blizzard</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about the emergency"
                  className="min-h-[60px] text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={clearDrawing} variant="outline" className="flex-1 text-sm">
                  Cancel
                </Button>
                <Button 
                  onClick={saveEmergency} 
                  disabled={loading || !formData.title || !formData.emergency_type}
                  className="flex-1 text-sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};