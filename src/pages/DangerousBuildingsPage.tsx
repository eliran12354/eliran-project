import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const handleSearch = () => {
    filterBuildings();
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
      <div className="w-full" dir="rtl">
        <div className="max-w-[1280px] mx-auto px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-500">טוען נתונים...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full" dir="rtl">
        <div className="max-w-[1280px] mx-auto px-6 py-6">
          <div className="bg-white dark:bg-slate-900 border border-[#dbdfe6] dark:border-gray-800 rounded-xl p-6">
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
              <h3 className="text-xl font-semibold mb-2 text-red-600">שגיאה בטעינת הנתונים</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              <Button onClick={loadBuildings}>נסה שוב</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-4 text-[#616f89] dark:text-gray-400 text-sm">
          <Link className="hover:text-primary transition-colors" to="/">
            דף הבית
          </Link>
          <span className="material-symbols-outlined text-xs">chevron_left</span>
          <span className="text-[#111318] dark:text-white font-medium">איתור מבנים מסוכנים</span>
        </nav>

        {/* Page Heading */}
        <div className="mb-8">
          <h2 className="text-[#111318] dark:text-white text-3xl font-black leading-tight mb-2 font-display">
            מיקומי מבנים מסוכנים
          </h2>
          <p className="text-[#616f89] dark:text-gray-400 text-base">
            ניהול ומעקב אחר הצהרות על מבנים מסוכנים וסטטוסי טיפול ברמה ארצית.
          </p>
        </div>

        {/* Search & Filter Grid */}
        <section className="bg-white dark:bg-background-dark border border-[#dbdfe6] dark:border-gray-800 rounded-xl p-6 mb-8 shadow-sm">
          <h3 className="text-[#111318] dark:text-white text-base font-bold mb-4">חיפוש וסינון</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">חיפוש חופשי (כתובת/חלקה)</label>
              <div className="relative">
                <Input
                  className="w-full h-11 px-4 pr-10 rounded-lg border border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-900 text-[#111318] dark:text-white focus:ring-primary focus:border-primary"
                  placeholder="הזן כתובת או מספר גוש/חלקה"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#616f89] pointer-events-none">
                  search
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">עיר</label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full h-11 px-4 rounded-lg border border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-900 text-[#111318] dark:text-white focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="כל הערים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הערים</SelectItem>
                  {uniqueCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">סטטוס טיפול</label>
              <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
                <SelectTrigger className="w-full h-11 px-4 rounded-lg border border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-900 text-[#111318] dark:text-white focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="כל הסטטוסים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  {uniqueTreatmentStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">filter_alt</span>
                חיפוש
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 bg-white dark:bg-gray-800 border border-[#dbdfe6] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-[#111318] dark:text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                ייצוא
              </Button>
            </div>
          </div>
        </section>

        {/* Data Table Section */}
        {currentBuildings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-[#dbdfe6] dark:border-gray-800 rounded-xl p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">search_off</span>
              <h3 className="text-xl font-semibold mb-2 text-[#111318] dark:text-white">לא נמצאו מבנים</h3>
              <p className="text-slate-500 mb-4">
                {hasActiveFilters
                  ? "נסה לשנות את הסינון או החיפוש"
                  : "אין מבנים מסוכנים"}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-background-dark border border-[#dbdfe6] dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#f0f2f4] dark:bg-gray-800/50 border-b border-[#dbdfe6] dark:border-gray-700">
                    <th className="px-6 py-4 text-[#111318] dark:text-white font-bold text-sm">עיר</th>
                    <th className="px-6 py-4 text-[#111318] dark:text-white font-bold text-sm">כתובת</th>
                    <th className="px-6 py-4 text-[#111318] dark:text-white font-bold text-sm">גוש</th>
                    <th className="px-6 py-4 text-[#111318] dark:text-white font-bold text-sm">חלקה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dbdfe6] dark:divide-gray-800">
                  {currentBuildings.map((building, index) => (
                    <tr
                      key={`${building["כתובת"]}-${building["עיר"]}-${index}`}
                      className={`hover:bg-[#f8f9fa] dark:hover:bg-gray-800/30 transition-colors ${
                        index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-[#111318] dark:text-gray-200 text-sm">
                        {building["עיר"] || "-"}
                      </td>
                      <td className="px-6 py-4 text-[#111318] dark:text-gray-200 text-sm">
                        {building["כתובת"] || "-"}
                      </td>
                      <td className="px-6 py-4 text-[#111318] dark:text-gray-200 text-sm font-medium">
                        {building["גוש"] || "-"}
                      </td>
                      <td className="px-6 py-4 text-[#111318] dark:text-gray-200 text-sm font-medium">
                        {building["חלקה"] || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[#dbdfe6] dark:border-gray-800 flex items-center justify-between">
                <p className="text-[#616f89] dark:text-gray-400 text-sm">
                  מציג {startIndex + 1}-{Math.min(endIndex, filteredBuildings.length)} מתוך {filteredBuildings.length} רשומות
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded border border-[#dbdfe6] dark:border-gray-700 text-[#616f89] hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage <= 2) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = currentPage - 1 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 flex items-center justify-center rounded border border-[#dbdfe6] dark:border-gray-700 text-[#111318] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white font-bold border-primary'
                            : ''
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded border border-[#dbdfe6] dark:border-gray-700 text-[#616f89] hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
