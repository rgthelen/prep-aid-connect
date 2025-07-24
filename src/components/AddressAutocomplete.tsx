import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface AddressResult {
  place_name: string;
  center: [number, number];
  context?: Array<{ text: string; id: string }>;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

export const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Enter address", 
  className 
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const searchAddresses = async (query: string) => {
    setLoading(true);
    try {
      // Get Mapbox token from Supabase Edge Function
      const tokenResponse = await fetch(`https://xlgbutxnfpkggwalxptj.supabase.co/functions/v1/get-mapbox-token`, {
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZ2J1dHhuZnBrZ2d3YWx4cHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzU0MTIsImV4cCI6MjA2ODk1MTQxMn0.XzKd7dgbGLrp-aOHBA6OSRl63yu4WeGrE_AE7GsLpJs`,
        },
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to fetch Mapbox token');
      }
      
      const { token: mapboxToken } = await tokenResponse.json();
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=US&types=address,place,postcode&limit=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: AddressResult) => {
    onChange(result.place_name);
    setShowSuggestions(false);
    onSelect?.(result);
    inputRef.current?.blur();
  };

  const formatAddress = (result: AddressResult) => {
    return result.place_name;
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className={className}
        />
        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 p-0 shadow-lg border">
          <div className="max-h-60 overflow-y-auto">
            {suggestions.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelect(result)}
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none first:rounded-t-md last:rounded-b-md"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {formatAddress(result)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {loading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <Card className="p-3 text-center">
            <p className="text-sm text-muted-foreground">Searching...</p>
          </Card>
        </div>
      )}
    </div>
  );
};