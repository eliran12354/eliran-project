import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { useState } from "react";
import DeclaredProjectsMap from "./DeclaredProjectsMap";

export function PropertyMap() {
  const [selectedCity, setSelectedCity] = useState("הכל");

  return (
    <div className="flex gap-8 min-h-[calc(100vh-120px)] animate-fade-in">
      {/* Map Area */}
      <div className="flex-1">
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

        <div className="mt-6 flex items-center justify-between">
          <div className="text-base text-muted-foreground font-medium">
            6 נכסים במפה • תל אביב-יפו, ישראל
          </div>
        </div>
      </div>

      {/* Sidebar Filters */}
      <Card className="w-96 p-6 space-y-8 shadow-large bg-gradient-card border-0 h-fit self-start">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold">פילטרים</h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-semibold mb-3 block text-primary">סוג נכס</label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="h-12 border-2 border-primary/20 focus:border-primary shadow-soft">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="shadow-large">
                <SelectItem value="הכל">הכל</SelectItem>
                <SelectItem value="דירה">דירה</SelectItem>
                <SelectItem value="בית">בית</SelectItem>
                <SelectItem value="פנטהאוס">פנטהאוס</SelectItem>
                <SelectItem value="משרדים">משרדים</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-3 block text-primary">עיר</label>
            <Select value="תל אביב" onValueChange={setSelectedCity}>
              <SelectTrigger className="h-12 border-2 border-primary/20 focus:border-primary shadow-soft">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="shadow-large">
                <SelectItem value="תל אביב">תל אביב</SelectItem>
                <SelectItem value="רמת גן">רמת גן</SelectItem>
                <SelectItem value="גבעתיים">גבעתיים</SelectItem>
                <SelectItem value="רמת השרון">רמת השרון</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-3 block text-primary">טווח מחירים</label>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-10 hover-lift shadow-soft">עד 2M ₪</Button>
              <Button variant="outline" size="sm" className="flex-1 h-10 hover-lift shadow-soft">2-5M ₪</Button>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" size="sm" className="flex-1 h-10 hover-lift shadow-soft">5M+ ₪</Button>
              <Button variant="outline" size="sm" className="flex-1 h-10 hover-lift shadow-soft">מותאם אישית</Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-3 block text-primary">חדרים</label>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-10 hover-lift shadow-soft">2-3</Button>
              <Button variant="outline" size="sm" className="flex-1 h-10 hover-lift shadow-soft">4-5</Button>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="text-base font-semibold mb-2 text-primary">
            6 נכסים מוצגים
          </div>
          <div className="text-sm text-muted-foreground">
            תל אביב-יפו, ישראל
          </div>
        </div>

        <div className="flex items-center justify-center p-6 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover-lift">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">נכסים (6)</div>
            <div className="text-sm text-muted-foreground mt-1">במפה הנוכחית</div>
          </div>
        </div>
      </Card>
    </div>
  );
}