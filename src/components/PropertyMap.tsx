import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import DeclaredProjectsMap from "./DeclaredProjectsMap";
import { GoogleMapsMap } from "./GoogleMapsMap";

export function PropertyMap() {
  const [gush, setGush] = useState<string>("");
  const [helka, setHelka] = useState<string>("");
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);

  return (
    <div className="min-h-[calc(100vh-120px)] animate-fade-in">
      {/* Map Area */}
      <div className="w-full">
        <div className="mb-6 space-y-4">
          {/* Search by Gush and Helka */}
          <div className="flex gap-4 items-end" dir="rtl">
            <div className="flex-1">
              <label htmlFor="gush" className="block text-sm font-medium text-gray-700 mb-1">
                גוש
              </label>
              <Input
                id="gush"
                type="number"
                value={gush}
                onChange={(e) => setGush(e.target.value)}
                placeholder="לדוגמה: 30500"
                className="h-12 text-lg border-2 border-primary/20 focus:border-primary shadow-soft"
                dir="ltr"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="helka" className="block text-sm font-medium text-gray-700 mb-1">
                חלקה
              </label>
              <Input
                id="helka"
                type="number"
                value={helka}
                onChange={(e) => setHelka(e.target.value)}
                placeholder="לדוגמה: 42"
                className="h-12 text-lg border-2 border-primary/20 focus:border-primary shadow-soft"
                dir="ltr"
              />
            </div>
            <Button
              onClick={() => {
                if (useGoogleMaps) {
                  // TODO: Implement search for Google Maps
                  alert("פונקציית חיפוש תתווסף בקרוב");
                } else {
                  // Pass search params to DeclaredProjectsMap
                  const event = new CustomEvent('parcelSearch', {
                    detail: { gush, helka }
                  });
                  window.dispatchEvent(event);
                }
              }}
              disabled={!gush || !helka}
              className="h-12 px-8 bg-gradient-primary shadow-glow hover:shadow-large transition-all duration-300"
            >
              <Search className="w-5 h-5 ml-2" />
              חפש חלקה
            </Button>
          </div>

          {/* Address search */}
          <div className="flex gap-6">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                placeholder="חפש לפי כתובת או איזור..."
                className="pr-12 h-14 text-lg border-2 border-primary/20 focus:border-primary shadow-soft"
              />
            </div>
            <Button variant="outline" className="gap-3 h-14 px-8 hover-lift shadow-soft">
              <Filter className="w-5 h-5" />
              פילטרים
            </Button>
          </div>
        </div>

        {/* Map Toggle Button */}
        <div className="mb-4 flex justify-end" dir="rtl">
          <Button
            variant="outline"
            onClick={() => setUseGoogleMaps(!useGoogleMaps)}
            className="gap-2"
          >
            {useGoogleMaps ? "מעבר למפת Leaflet" : "מעבר למפת Google"}
          </Button>
        </div>

        <div className="relative w-full h-[75vh] min-h-[620px]">
          {useGoogleMaps ? (
            <GoogleMapsMap searchGush={gush} searchHelka={helka} />
          ) : (
            <DeclaredProjectsMap searchGush={gush} searchHelka={helka} />
          )}
        </div>
      </div>
    </div>
  );
}
