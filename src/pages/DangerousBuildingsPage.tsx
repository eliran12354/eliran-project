import { useState, useEffect } from "react";
import { AlertTriangle, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

interface DangerousBuilding {
  "כתובת"?: string;
  "עיר"?: string;
  "גוש"?: number | string;
  "חלקה"?: number | string;
  // שדות נוספים ספציפיים לכל עיר
  [key: string]: any;
}

export default function DangerousBuildingsPage() {
  const [buildings, setBuildings] = useState<DangerousBuilding[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<DangerousBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    loadBuildings();
  }, []);

  useEffect(() => {
    filterBuildings();
  }, [buildings, searchTerm, cityFilter, treatmentFilter]);

  const normalizeBuilding = (building: any, city?: string): DangerousBuilding => {
    const normalized: DangerousBuilding = {
      ...building,
    };

    // הוספת עיר אם חסר
    if (!normalized["עיר"] && city) {
      normalized["עיר"] = city;
    }

    // טיפול בכתובת - איחוד רחוב + מספר בית לכתובת
    if (!normalized["כתובת"]) {
      if (building["רחוב"] && building["מספר בית"]) {
        normalized["כתובת"] = `${building["רחוב"]} ${building["מספר בית"]}`;
      } else if (building["שם רחוב"] && building["מספר בית"]) {
        normalized["כתובת"] = `${building["שם רחוב"]} ${building["מספר בית"]}`;
      } else if (building["רחוב"]) {
        normalized["כתובת"] = building["רחוב"];
      } else if (building["שם רחוב"]) {
        normalized["כתובת"] = building["שם רחוב"];
      }
    }

    // טיפול בגוש/חלקה משולב בכפר סבא
    if (building["גוש/חלקה"] && typeof building["גוש/חלקה"] === "string") {
      const parts = building["גוש/חלקה"].split("/");
      if (parts.length === 2) {
        normalized["גוש"] = parts[0].trim();
        normalized["חלקה"] = parts[1].trim();
      }
    }

    return normalized;
  };

  const loadBuildingsFromDatabase = async (): Promise<DangerousBuilding[]> => {
    try {
      const { data, error } = await supabase
        .from('dangerous_buildings_active')
        .select('*');

      if (error) {
        console.error('Error loading from database:', error);
        return [];
      }

      if (!data) return [];

      return data.map(item => ({
        "כתובת": item.address || null,
        "עיר": item.city_name || "ראשון לציון",
        "גוש": item.block_number || null,
        "חלקה": item.parcel_number || null,
        "תיק טיפול": item.treatment_file || null,
        "מצב טיפול": item.treatment_status || null,
        "מצב אכלוס": item.occupancy_status || null,
        "תיק בנין": item.file_number || null,
        // שמירת כל השדות הנוספים
        ...Object.entries(item).reduce((acc, [key, value]) => {
          if (!['address', 'city_name', 'block_number', 'parcel_number', 'treatment_file', 'treatment_status', 'occupancy_status', 'file_number'].includes(key)) {
            acc[key] = value;
          }
          return acc;
        }, {} as any)
      })).filter(item => item["כתובת"]); // סינון רשומות ללא כתובת
    } catch (err) {
      console.error('Error loading from database:', err);
      return [];
    }
  };

  const loadBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const files = [
        { name: "מבנים_מסוכנים_רק_שדות_מבוקשים.json", city: "תל אביב" },
        { name: "מבנים_מסוכנים_כפר_סבא.json", city: "כפר סבא" },
        { name: "מבנים_מסוכנים_בת_ים.json", city: "בת ים" },
        { name: "מבנים_מסוכנים_פתח_תקווה.json", city: "פתח תקווה" },
        { name: "מבנים_מסוכנים_רמת_גן.json", city: "רמת גן" },
        { name: "מבנים_מסוכנים_אשדוד.json", city: "אשדוד" },
        { name: "holon_dangerous_buildings.json", city: "חולון" },
        { name: "מבנים_מסוכנים_חולון_כל_העמודים.json", city: "חולון" },
        { name: "מבנים_מסוכנים_קריית_גת_מלא.json", city: "קריית גת" },
      ];

      const allBuildings: DangerousBuilding[] = [];

      // טעינה מהקבצים
      for (const file of files) {
        try {
          const fileName = encodeURIComponent(file.name);
          const response = await fetch(`/data/${fileName}`);
          
          if (!response.ok) {
            console.warn(`Failed to load ${file.name}`);
            continue;
          }
          
          const data: any[] = await response.json();
          
          // נורמליזציה וסינון שורות כותרות
          const normalized = data
            .filter(item => {
              // סינון שורות כותרות (כמו "רחוב", "מספר בית" וכו')
              if (item["רחוב"] === "רחוב" || item["מספר בית"] === "מס' בית" || item["כתובת"] === "כתובת") {
                return false;
              }
              // סינון רשומות ללא כתובת (צריך להיות כתובת, רחוב, או שם רחוב)
              const hasAddress = item["כתובת"] || item["רחוב"] || item["שם רחוב"];
              if (!hasAddress) {
                return false;
              }
              return true;
            })
            .map(item => normalizeBuilding(item, file.city))
            .filter(item => item["כתובת"]); // סינון סופי - רק עם כתובת לאחר נורמליזציה
          
          allBuildings.push(...normalized);
        } catch (err) {
          console.warn(`Error loading ${file.name}:`, err);
        }
      }

      // טעינה מהמסד נתונים (ראשון לציון)
      try {
        const dbBuildings = await loadBuildingsFromDatabase();
        allBuildings.push(...dbBuildings);
      } catch (err) {
        console.warn('Error loading from database:', err);
      }

      setBuildings(allBuildings);
      setFilteredBuildings(allBuildings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הנתונים");
      console.error("Error loading buildings:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterBuildings = () => {
    let filtered = [...buildings];

    // חיפוש
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (building) =>
          building["כתובת"]?.toLowerCase().includes(search) ||
          building["עיר"]?.toLowerCase().includes(search) ||
          building["גוש"]?.toString().toLowerCase().includes(search) ||
          building["חלקה"]?.toString().toLowerCase().includes(search)
      );
    }

    // סינון לפי עיר
    if (cityFilter !== "all") {
      filtered = filtered.filter(
        (building) => building["עיר"] === cityFilter
      );
    }

    // סינון מצב טיפול (אם קיים)
    if (treatmentFilter !== "all") {
      filtered = filtered.filter(
        (building) => building["מצב טיפול"] === treatmentFilter
      );
    }

    setFilteredBuildings(filtered);
    setCurrentPage(1);
  };


  const clearFilters = () => {
    setSearchTerm("");
    setCityFilter("all");
    setTreatmentFilter("all");
  };

  // קבלת ערכים ייחודיים לסינון
  const uniqueCities = Array.from(
    new Set(buildings.map((b) => b["עיר"]).filter(Boolean))
  ).sort();

  const uniqueTreatmentStatuses = Array.from(
    new Set(buildings.map((b) => b["מצב טיפול"]).filter(Boolean))
  ).sort();

  // חישוב עמודים
  const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBuildings = filteredBuildings.slice(startIndex, endIndex);

  const hasActiveFilters = searchTerm || cityFilter !== "all" || treatmentFilter !== "all";

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">איתור מבנים מסוכנים</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              מידע על מבנים מסוכנים ודרכי איתורם
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">טוען נתונים...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">איתור מבנים מסוכנים</h2>
            </div>
          </div>
        </div>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-red-600">שגיאה בטעינת הנתונים</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadBuildings}>נסה שוב</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">איתור מבנים מסוכנים</h2>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card shadow-soft border-0">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">חיפוש וסינון</h3>
          </div>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Input
                  placeholder="חיפוש לפי כתובת, עיר, גוש או חלקה..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10"
                />
              </div>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm" className="h-10">
                  <X className="w-4 h-4 mr-2" />
                  נקה סינונים
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">עיר</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="הכל" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    {uniqueCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {uniqueTreatmentStatuses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">מצב טיפול</label>
                  <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="הכל" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">הכל</SelectItem>
                      {uniqueTreatmentStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      {currentBuildings.length === 0 ? (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">לא נמצאו מבנים</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters
                ? "נסה לשנות את הסינון או החיפוש"
                : "אין מבנים מסוכנים"}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline">
                <X className="w-4 h-4 mr-2" />
                נקה חיפוש
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <Card className="bg-gradient-card shadow-soft border-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="w-[150px] font-semibold text-base text-right">עיר</TableHead>
                    <TableHead className="font-semibold text-base text-right">כתובת</TableHead>
                    <TableHead className="w-[120px] text-center font-semibold text-base">גוש</TableHead>
                    <TableHead className="w-[120px] text-center font-semibold text-base">חלקה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBuildings.map((building, index) => (
                    <TableRow key={`${building["כתובת"]}-${building["עיר"]}-${index}`} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-base py-3 text-right">
                        {building["עיר"] || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="font-medium text-base whitespace-nowrap">{building["כתובת"] || "-"}</div>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <span className="font-medium">{building["גוש"] || "-"}</span>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <span className="font-medium">{building["חלקה"] || "-"}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  עמוד קודם
                </Button>
                <span className="text-sm font-medium px-3">
                  עמוד {currentPage} מתוך {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  עמוד הבא
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
