import { useEffect, useState, useMemo } from "react";
import { GeoJSON as LeafletGeoJSON } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection, GeoJsonProperties } from "geojson";
import * as turf from "@turf/turf";

// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LandUseMavatProperties extends GeoJsonProperties {
  id?: number;
  govmap_object_id?: number;
  layer_name?: string;
  mavat_code?: number;
  mavat_name?: string;
  pl_id?: number;
  pl_number?: string;
  pl_name?: string;
  station_desc?: string;
  last_update_date?: string;
  defq?: string;
  source_code?: string;
  area?: number;
  len?: number;
  scraped_at?: string;
}

type LandUseMavatFeature = Feature<any, LandUseMavatProperties>;
type LandUseMavatCollection = FeatureCollection<any, LandUseMavatProperties>;

interface LandUseMavatLayerProps {
  show: boolean;
  filterByParcel?: Feature | null;
}

const landUseMavatLayerStyle: L.PathOptions = {
  color: "#10b981",
  weight: 2,
  fillOpacity: 0.3,
  fillColor: "#10b981",
  opacity: 0.9,
};

export function LandUseMavatLayer({ show, filterByParcel }: LandUseMavatLayerProps) {
  const [landUseMavatData, setLandUseMavatData] = useState<LandUseMavatCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setLandUseMavatData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadLandUseMavat = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading land_use_mavat from backend API with progressive loading...');

        // Progressive loading - load chunks and update map immediately
        let allFeatures: LandUseMavatFeature[] = [];
        let page = 1;
        const pageSize = 500;
        let hasMore = true;
        
        // Initialize with empty FeatureCollection
        if (isMounted) {
          setLandUseMavatData({
            type: 'FeatureCollection',
            features: []
          } as LandUseMavatCollection);
        }

        while (hasMore && isMounted) {
          try {
            const response = await fetch(
              `${API_URL}/api/land-use-mavat/chunk?page=${page}&pageSize=${pageSize}`
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            console.log(`API response for page ${page}:`, {
              hasFeatures: !!data.features,
              featuresLength: data.features?.length || 0,
              hasMore: data.hasMore,
              totalLoaded: data.totalLoaded,
              responseKeys: Object.keys(data),
              firstFeature: data.features?.[0] || null
            });

            if (data.features && data.features.length > 0) {
              allFeatures = [...allFeatures, ...data.features];
              console.log(`Loaded chunk ${page}: ${data.features.length} land_use_mavat features, total: ${allFeatures.length}`);
              
              // Update map with current features (progressive loading)
              if (isMounted) {
                setLandUseMavatData({
                  type: 'FeatureCollection',
                  features: allFeatures
                } as LandUseMavatCollection);
              }
              
              hasMore = data.hasMore === true;
              page++;
            } else {
              console.log(`No features in chunk ${page}, stopping. Response:`, data);
              hasMore = false;
            }
          } catch (chunkError) {
            console.error(`Error loading chunk ${page}:`, chunkError);
            hasMore = false;
          }
        }

        if (isMounted) {
          console.log(`Finished loading ${allFeatures.length} land_use_mavat features total`);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading land_use_mavat:', err);
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת יעודי קרקע - מבא"ת');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLandUseMavat();

    return () => {
      isMounted = false;
    };
  }, [show]);

  const handleFeature = (feature: LandUseMavatFeature, layer: L.Layer) => {
    const props = feature.properties || {};
    
    // Extract information from properties
    const mavatName = props.mavat_name || props.layer_name || 'יעוד קרקע';
    const mavatCode = props.mavat_code || null;
    const plNumber = props.pl_number || null;
    const plName = props.pl_name || null;
    const area = props.area || null;
    const stationDesc = props.station_desc || null;
    
    // Build popup content
    let popupContent = `<div style="font-family: Arial, sans-serif; min-width: 200px;">`;
    popupContent += `<h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #059669;">${mavatName}</h3>`;
    
    if (mavatCode) {
      popupContent += `<p style="margin: 5px 0;"><strong>קוד מבא"ת:</strong> ${mavatCode}</p>`;
    }
    
    if (plNumber) {
      popupContent += `<p style="margin: 5px 0;"><strong>מספר תוכנית:</strong> ${plNumber}</p>`;
    }
    
    if (plName) {
      popupContent += `<p style="margin: 5px 0;"><strong>שם תוכנית:</strong> ${plName}</p>`;
    }
    
    if (area) {
      popupContent += `<p style="margin: 5px 0;"><strong>שטח:</strong> ${area.toLocaleString('he-IL')} מ"ר</p>`;
    }
    
    if (stationDesc) {
      popupContent += `<p style="margin: 5px 0;"><strong>תיאור תחנה:</strong> ${stationDesc}</p>`;
    }
    
    if (props.last_update_date) {
      popupContent += `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>עדכון אחרון:</strong> ${new Date(props.last_update_date).toLocaleDateString('he-IL')}</p>`;
    }
    
    popupContent += `</div>`;
    
    layer.bindPopup(popupContent);
    
    // Add hover effect
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        if (layer instanceof L.Path) {
          layer.setStyle({
            weight: 3,
            fillOpacity: 0.4,
            opacity: 1,
          });
        }
      },
      mouseout: (e) => {
        const layer = e.target;
        if (layer instanceof L.Path) {
          layer.setStyle(landUseMavatLayerStyle);
        }
      },
    });
  };

  if (!show || loading) {
    return null;
  }

  if (error) {
    console.error('Land use mavat layer error:', error);
    return null;
  }

  if (!landUseMavatData || landUseMavatData.features.length === 0) {
    console.log('Land use mavat: No data to render');
    return null;
  }

  // Log first few features to debug
  if (landUseMavatData.features.length > 0) {
    const firstFeature = landUseMavatData.features[0];
    const secondFeature = landUseMavatData.features[1];
    const thirdFeature = landUseMavatData.features[2];
    
    console.log('Land use mavat - First 3 features:', {
      feature1: {
        hasGeometry: !!firstFeature.geometry,
        geometryType: firstFeature.geometry?.type,
        hasCoordinates: !!firstFeature.geometry?.coordinates,
        coordinates: firstFeature.geometry?.type === 'Point' 
          ? firstFeature.geometry.coordinates 
          : firstFeature.geometry?.type === 'Polygon'
          ? firstFeature.geometry.coordinates?.[0]?.[0]?.[0]
          : firstFeature.geometry?.coordinates?.[0]?.[0]?.[0]?.[0],
        properties: firstFeature.properties
      },
      feature2: secondFeature ? {
        geometryType: secondFeature.geometry?.type,
        coordinates: secondFeature.geometry?.type === 'Point' 
          ? secondFeature.geometry.coordinates 
          : secondFeature.geometry?.coordinates?.[0]?.[0]?.[0],
      } : null,
      feature3: thirdFeature ? {
        geometryType: thirdFeature.geometry?.type,
        coordinates: thirdFeature.geometry?.type === 'Point' 
          ? thirdFeature.geometry.coordinates 
          : thirdFeature.geometry?.coordinates?.[0]?.[0]?.[0],
      } : null,
    });
  }

  // Filter out features with invalid geometry
  let invalidCount = 0;
  const validFeatures = landUseMavatData.features.filter((feature: any) => {
    if (!feature.geometry) {
      invalidCount++;
      if (invalidCount <= 3) {
        console.warn('Feature missing geometry:', feature);
      }
      return false;
    }
    
    // Check if coordinates are valid
    if (feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) {
        return false;
      }
      const [lng, lat] = coords;
      // Validate coordinates are in Israel bounds (more lenient for now)
      if (lat < 28 || lat > 35 || lng < 33 || lng > 37) {
        if (invalidCount < 3) {
          console.warn('Land use mavat: Point coordinates out of bounds:', { lng, lat, feature: feature.properties });
        }
        invalidCount++;
        return false;
      }
    } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      const coords = feature.geometry.coordinates;
      if (!coords || !coords[0] || !coords[0][0]) {
        return false;
      }
      // Check first coordinate
      const firstCoord = feature.geometry.type === 'Polygon' 
        ? coords[0][0]
        : coords[0][0][0];
      if (!firstCoord || firstCoord.length < 2) {
        return false;
      }
      const [lng, lat] = firstCoord;
      // Validate coordinates are in Israel bounds (more lenient for now)
      if (lat < 28 || lat > 35 || lng < 33 || lng > 37) {
        if (invalidCount < 3) {
          console.warn('Land use mavat: Polygon coordinates out of bounds:', { lng, lat, feature: feature.properties });
        }
        invalidCount++;
        return false;
      }
    }
    
    return true;
  });

  console.log(`Land use mavat: Rendering ${validFeatures.length} valid features out of ${landUseMavatData.features.length} total`);

  if (validFeatures.length === 0) {
    console.warn('Land use mavat: No valid features to render after filtering');
    return null;
  }

  // Filter features by parcel if parcel is provided
  const filteredFeatures = useMemo(() => {
    if (!filterByParcel || !filterByParcel.geometry) {
      return validFeatures;
    }

    try {
      // Create turf polygon from parcel
      const parcelPolygon = turf.feature(filterByParcel.geometry);
      
      // Filter features that intersect with or are within the parcel
      const filtered = validFeatures.filter((feature: any) => {
        if (!feature.geometry) return false;

        try {
          const featureGeo = turf.feature(feature.geometry);
          
          // Check if feature intersects with parcel
          if (turf.booleanIntersects(parcelPolygon, featureGeo)) {
            return true;
          }
          
          // For Point features, check if point is within parcel
          if (feature.geometry.type === 'Point') {
            return turf.booleanPointInPolygon(featureGeo, parcelPolygon);
          }
          
          return false;
        } catch (err) {
          console.warn('Error checking feature intersection:', err);
          return false;
        }
      });

      console.log(`Filtered ${filtered.length} land use features within parcel out of ${validFeatures.length} total`);
      return filtered;
    } catch (err) {
      console.error('Error filtering features by parcel:', err);
      return validFeatures;
    }
  }, [validFeatures, filterByParcel]);

  const validData: LandUseMavatCollection = {
    type: 'FeatureCollection',
    features: filteredFeatures
  };

  // Log rendering info
  console.log('Land use mavat: About to render LeafletGeoJSON with', validFeatures.length, 'features');

  return (
    <LeafletGeoJSON
      key={`land-use-mavat-${filteredFeatures.length}-${filterByParcel ? 'filtered' : 'all'}`}
      data={validData}
      style={(feature) => {
        // Return style for each feature
        return landUseMavatLayerStyle;
      }}
      pointToLayer={(feature, latlng) => {
        // Create a green circle marker for Point features
        console.log('Creating point marker at:', latlng);
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: "#10b981",
          color: "#059669",
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.8
        });
      }}
      onEachFeature={(feature, layer) => {
        // Log when feature is added
        if (validFeatures.indexOf(feature as any) < 5) {
          console.log('Land use mavat: Feature added to map:', {
            geometryType: feature.geometry?.type,
            layerType: layer.constructor.name,
            hasPopup: !!layer.getPopup()
          });
        }
        handleFeature(feature as LandUseMavatFeature, layer);
      }}
    />
  );
}

