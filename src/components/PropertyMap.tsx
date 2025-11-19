import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import DeclaredProjectsMap from "./DeclaredProjectsMap";

export function PropertyMap() {
  return (
    <div className="min-h-[calc(100vh-120px)] animate-fade-in">
      {/* Map Area */}
      <div className="w-full">
        <div className="mb-6 flex gap-6">
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

        <div className="relative w-full h-[75vh] min-h-[620px]">
          <DeclaredProjectsMap />
        </div>
      </div>
    </div>
  );
}
