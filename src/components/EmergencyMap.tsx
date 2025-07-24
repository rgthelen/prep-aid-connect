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
import { MapPin, Circle, Square, Save, X } from 'lucide-react';

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
  }>;
}

export const EmergencyMap = ({ onEmergencyCreated, existingEmergencies }: EmergencyMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
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
  const { toast } = useToast();

  useEffect(() => {
    if (!mapContainer.current) return;

    // Get Mapbox token from Supabase Edge Function
    const initializeMap = async () => {
      try {
        const response = await fetch(`https://xlgbutxnfpkggwalxptj.supabase.co/functions/v1/get-mapbox-token`, {
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZ2J1dHhuZnBrZ2d3YWx4cHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzU0MTIsImV4cCI6MjA2ODk1MTQxMn0.XzKd7dgbGLrp-aOHBA6OSRl63yu4WeGrE_AE7GsLpJs`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch Mapbox token');
        }
        
        const { token } = await response.json();
        mapboxgl.accessToken = token;
    
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-95.7129, 37.0902], // Center of US
          zoom: 4,
        });

        // Add geocoder for search
        const geocoder = new MapboxGeocoder({
          accessToken: token,
          mapboxgl: mapboxgl,
          placeholder: 'Search for places, addresses, or zip codes',
          bbox: [-125.0011, 20.7197, -66.9326, 49.5904], // US bounding box
        });

        map.current.addControl(geocoder, 'top-left');
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Load existing emergencies
        map.current.on('load', () => {
          loadExistingEmergencies();
          setupDrawingHandlers();
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

  const loadExistingEmergencies = () => {
    if (!map.current || !existingEmergencies) return;

    existingEmergencies.forEach((emergency, index) => {
      // For now, create simple markers - in production, you'd geocode the zipcode/state
      const marker = new mapboxgl.Marker({
        color: emergency.is_active ? '#ef4444' : '#6b7280'
      })
        .setLngLat([-95 + (index * 0.5), 37 + (index * 0.5)]) // Placeholder coordinates
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <div class="p-2">
              <h3 class="font-semibold">${emergency.title}</h3>
              <p class="text-sm text-gray-600">${emergency.emergency_type}</p>
              <p class="text-sm">${emergency.zipcode}, ${emergency.state}</p>
              <p class="text-sm">Radius: ${emergency.radius_miles} miles</p>
              <p class="text-sm">Status: ${emergency.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          `)
        )
        .addTo(map.current!);
    });
  };

  const setupDrawingHandlers = () => {
    if (!map.current) return;

    map.current.on('click', (e) => {
      if (drawingMode === 'circle') {
        createCircleArea(e.lngLat);
      }
    });
  };

  const createCircleArea = (center: mapboxgl.LngLat) => {
    if (!map.current) return;

    const radiusInKm = formData.radius_miles * 1.60934; // Convert miles to km
    const circle = turf.circle([center.lng, center.lat], radiusInKm);
    
    const sourceId = 'emergency-area';
    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(circle);
    } else {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: circle
      });

      map.current.addLayer({
        id: 'emergency-area-fill',
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.3
        }
      });

      map.current.addLayer({
        id: 'emergency-area-outline',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ef4444',
          'line-width': 2
        }
      });
    }

    setCurrentDrawing({
      type: 'circle',
      center: [center.lng, center.lat],
      radius_miles: formData.radius_miles,
      geometry: circle
    });
    setShowForm(true);
  };

  const clearDrawing = () => {
    if (!map.current) return;
    
    const sourceId = 'emergency-area';
    if (map.current.getLayer('emergency-area-fill')) {
      map.current.removeLayer('emergency-area-fill');
    }
    if (map.current.getLayer('emergency-area-outline')) {
      map.current.removeLayer('emergency-area-outline');
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }
    
    setCurrentDrawing(null);
    setShowForm(false);
    setDrawingMode(null);
  };

  const saveEmergency = async () => {
    if (!currentDrawing) return;

    setLoading(true);
    try {
      // Get the current user's profile ID instead of auth user ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (!profile) {
        throw new Error('User profile not found');
      }

      // For now, we'll use a placeholder zipcode and state
      // In production, you'd reverse geocode the center point
      const { error } = await supabase.from('emergencies').insert({
        title: formData.title,
        emergency_type: formData.emergency_type,
        description: formData.description,
        zipcode: '00000', // Placeholder
        state: 'US', // Placeholder
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
        <Card className="w-64">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Drawing Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={drawingMode === 'circle' ? 'default' : 'outline'}
                onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')}
                className="flex-1"
              >
                <Circle className="h-4 w-4 mr-1" />
                Circle
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-1" />
                Polygon
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
              />
            </div>

            {drawingMode && (
              <p className="text-xs text-muted-foreground">
                Click on the map to create a {drawingMode} area
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emergency Form */}
      {showForm && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card className="w-80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Create Emergency</CardTitle>
              <Button size="sm" variant="ghost" onClick={clearDrawing}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Hurricane Warning"
                />
              </div>

              <div>
                <Label htmlFor="type">Emergency Type</Label>
                <Select 
                  value={formData.emergency_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, emergency_type: value }))}
                >
                  <SelectTrigger>
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about the emergency"
                  className="min-h-[60px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={clearDrawing} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={saveEmergency} 
                  disabled={loading || !formData.title || !formData.emergency_type}
                  className="flex-1"
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