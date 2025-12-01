import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface GoogleMapsSearchProps {
  onLocationSelected?: (location: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
}

export function GoogleMapsSearch({ 
  onLocationSelected,
  placeholder = "חפש כתובת, מקום או אזור..."
}: GoogleMapsSearchProps) {
  const map = useMap();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Places Autocomplete
  useEffect(() => {
    if (!map || !inputRef.current) return;

    // Create Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address', 'place_id'],
      componentRestrictions: { country: 'il' }, // Restrict to Israel
      types: ['geocode', 'establishment'], // Addresses and businesses
    });

    // Handle place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      
      if (!place || !place.geometry || !place.geometry.location) {
        setSearchError('לא נמצא מיקום');
        return;
      }

      const location = place.geometry.location;
      const lat = location.lat();
      const lng = location.lng();
      const address = place.formatted_address || place.name || searchQuery;

      // Move map to location
      map.setCenter({ lat, lng });
      map.setZoom(16);

      // Call callback if provided
      if (onLocationSelected) {
        onLocationSelected({ lat, lng, address });
      }

      setSearchQuery(address);
      setSearchError(null);
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [map, onLocationSelected]);

  // Handle manual search (Enter key or button click)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !map) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const geocoder = new google.maps.Geocoder();
      
      const results = await geocoder.geocode({
        address: searchQuery,
        componentRestrictions: { country: 'il' }, // Restrict to Israel
      });

      if (!results.results || results.results.length === 0) {
        setSearchError('לא נמצאו תוצאות למיקום זה');
        return;
      }

      const result = results.results[0];
      const location = result.geometry.location;
      const lat = location.lat();
      const lng = location.lng();
      const address = result.formatted_address;

      // Move map to location
      map.setCenter({ lat, lng });
      map.setZoom(16);

      // Call callback if provided
      if (onLocationSelected) {
        onLocationSelected({ lat, lng, address });
      }

      setSearchQuery(address);
    } catch (err) {
      console.error('Geocoding error:', err);
      setSearchError('שגיאה בחיפוש המיקום');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, map, onLocationSelected]);

  // Handle Enter key
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  // Clear search
  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSearchError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="absolute top-4 left-4 z-10 w-full max-w-md" dir="rtl">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchError(null);
              }}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="pr-10 pl-4 h-10 text-sm"
              disabled={isSearching}
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            size="sm"
            className="h-10 px-4"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
        {searchError && (
          <div className="mt-2 text-sm text-red-600 px-2">
            {searchError}
          </div>
        )}
      </div>
    </div>
  );
}

