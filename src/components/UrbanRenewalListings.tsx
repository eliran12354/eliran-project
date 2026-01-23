import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Backend API URL
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

// Fetch urban renewal mitchamim from backend (which uses data.gov.il API)
async function fetchUrbanRenewalMitchamim(options: {
  limit?: number;
  offset?: number;
  filters?: {
    yeshuv?: string;
    status?: string;
    min_units?: number;
    max_units?: number;
  };
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  const response = await fetch(`${BACKEND_API_URL}/api/datagov/urban-renewal-mitchamim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch urban renewal mitchamim');
  }

  // Transform data.gov.il format to match expected format
  // data.gov.il uses PascalCase field names (MisparMitham, Yeshuv, etc.)
  const transformedData = result.data.map((item: any, index: number) => {
    // Helper function to trim whitespace
    const trim = (str: any) => (typeof str === 'string' ? str.trim() : str);
    
    // Helper function to parse number
    const parseNum = (val: any) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? Number(val.trim()) : Number(val);
      return isNaN(num) ? null : num;
    };
    
    const transformed = {
      id: item._id || item.id || `mitcham-${index}-${Date.now()}`,
      mispar_mitham: parseNum(item.MisparMitham),
      shem_mitcham: trim(item.ShemMitcham),
      yeshuv: trim(item.Yeshuv),
      semel_yeshuv: parseNum(item.SemelYeshuv),
      status: trim(item.Status),
      mispar_yahidot: parseNum(item.YachadTosafti), // Total units = additional units
      mispar_tochnit: trim(item.MisparTochnit),
      yachad_kayam: parseNum(item.YachadKayam),
      yachad_tosafti: parseNum(item.YachadTosafti),
      yachad_mutza: parseNum(item.YachadMutza),
      taarich_hachraza: trim(item.TaarichHachraza),
      kishur_latar: trim(item.KishurLatar),
      kishur_la_mapa: trim(item.KishurLaMapa),
      sach_heterim: parseNum(item.SachHeterim),
      maslul: trim(item.Maslul),
      shnat_matan_tokef: parseNum(item.ShnatMatanTokef),
      bebitzua: trim(item.Bebitzua),
      imported_at: new Date().toISOString(), // data.gov.il doesn't have imported_at
    };
    
    return {
      ...transformed,
      ...item, // Keep all original fields for fallback
    };
  });

  return {
    data: transformedData,
    total: result.total || transformedData.length,
  };
}

export function UrbanRenewalListings() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    yeshuv: '',
    status: '',
    min_units: '',
    max_units: ''
  })
  const [sortBy, setSortBy] = useState('imported_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Fetch mitchamim with filters from backend
  const { data: mitchamimData, isLoading, error } = useQuery({
    queryKey: ['urban-renewal-mitchamim', filters, searchQuery, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;
      
      const filterParams: any = {};
      if (filters.yeshuv) filterParams.yeshuv = filters.yeshuv;
      if (filters.status) filterParams.status = filters.status;
      if (filters.min_units) filterParams.min_units = Number(filters.min_units);
      if (filters.max_units) filterParams.max_units = Number(filters.max_units);
      
      // Map sortBy to data.gov.il field names
      const sortByField = sortBy === 'imported_at' ? 'IMPORTED_AT' : 
                         sortBy === 'yeshuv' ? 'YESHUV' :
                         sortBy === 'status' ? 'STATUS' :
                         sortBy === 'mispar_yahidot' ? 'MISPAR_YAHIDOT' :
                         'IMPORTED_AT'; // default
      
      return await fetchUrbanRenewalMitchamim({
        limit: itemsPerPage,
        offset,
        filters: Object.keys(filterParams).length > 0 ? filterParams : undefined,
        search: searchQuery || undefined,
        sortBy: sortByField,
        sortOrder,
      });
    }
  })

  const mitchamim = mitchamimData?.data || []
  const totalMitchamim = mitchamimData?.total || 0
  const totalPages = Math.ceil(totalMitchamim / itemsPerPage)

  // Get unique values for filters - fetch a sample to get unique values
  const { data: allMitchamim, isLoading: isLoadingAllMitchamim } = useQuery({
    queryKey: ['all-urban-renewal-mitchamim-sample'],
    queryFn: async () => {
      const result = await fetchUrbanRenewalMitchamim({ limit: 1000 });
      return result.data;
    }
  })

  const uniqueCities = Array.from(new Set(allMitchamim?.map((m: any) => m.yeshuv).filter(Boolean) || [])).sort()
  const uniqueStatuses = Array.from(new Set(allMitchamim?.map((m: any) => m.status).filter(Boolean) || [])).sort()

  const formatDate = (date: string) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        // Try parsing as DD.MM.YYYY
        const parts = date.split('.');
        if (parts.length === 3) {
          return date; // Return as is if already in DD.MM.YYYY format
        }
        return date;
      }
      return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return date;
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('מאושר') || statusLower.includes('אושר')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          מאושר
        </span>
      );
    } else if (statusLower.includes('תכנון') || statusLower.includes('בתהליך')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          בתהליך תכנון
        </span>
      );
    } else if (statusLower.includes('הפקדה') || statusLower.includes('מופקד')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          בהפקדה
        </span>
      );
    } else if (statusLower.includes('ביצוע') || statusLower.includes('בביצוע')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          בביצוע
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
        {status}
      </span>
    );
  }

  const handleSearch = () => {
    setSearchQuery(searchTerm)
    setCurrentPage(1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePreviousPage = () => {
    handlePageChange(currentPage - 1)
  }

  const handleNextPage = () => {
    handlePageChange(currentPage + 1)
  }

  const clearFilters = () => {
    setFilters({
      yeshuv: '',
      status: '',
      min_units: '',
      max_units: ''
    })
    setSearchTerm('')
    setSearchQuery('')
    setCurrentPage(1)
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '') || searchQuery !== ''

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        שגיאה בטעינת המתחמים: {error instanceof Error ? error.message : 'שגיאה לא ידועה'}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Search & Filter Area */}
      <section className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">filter_list</span>
          חיפוש וסינון
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">חיפוש חופשי</label>
            <Input
              placeholder="הזן שם מתחם..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">עיר</label>
            <Select value={filters.yeshuv || "all"} onValueChange={(value) => {
              setFilters(prev => ({ ...prev, yeshuv: value === "all" ? "" : value }))
              setCurrentPage(1)
            }}>
              <SelectTrigger className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm">
                <SelectValue placeholder="כל הערים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הערים</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">סטטוס</label>
            <Select value={filters.status || "all"} onValueChange={(value) => {
              setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))
              setCurrentPage(1)
            }}>
              <SelectTrigger className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm">
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">מינימום יחידות</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.min_units}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, min_units: e.target.value }))
                setCurrentPage(1)
              }}
              className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">מקסימום יחידות</label>
            <Input
              type="number"
              placeholder="ללא הגבלה"
              value={filters.max_units}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, max_units: e.target.value }))
                setCurrentPage(1)
              }}
              className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
        </div>
        <div className="flex justify-start gap-4 mt-8">
          <Button 
            onClick={handleSearch} 
            className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            חיפוש
          </Button>
          <Button 
            onClick={clearFilters} 
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-8 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ניקוי
          </Button>
        </div>
      </section>

      {/* Results Header */}
      {mitchamim && mitchamim.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[#617589] dark:text-gray-400 font-medium">
            מציג {mitchamim.length} מתוך {totalMitchamim} מתחמים שנמצאו
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">מיון לפי:</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
              <SelectTrigger className="bg-transparent border-none focus:ring-0 font-semibold cursor-pointer w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imported_at">תאריך עדכון</SelectItem>
                <SelectItem value="mispar_yahidot">מספר יחידות</SelectItem>
                <SelectItem value="yeshuv">א-ב</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results List */}
      {mitchamim && mitchamim.length > 0 ? (
        <div className="space-y-4">
          {mitchamim.map((mitcham: any) => (
            <article 
              key={mitcham.id} 
              className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                  <h4 className="text-xl font-bold mb-1">
                    {mitcham.shem_mitcham || `מתחם ${mitcham.mispar_mitham || ''}`}
                  </h4>
                  <p className="text-sm text-[#617589] dark:text-gray-400">
                    {mitcham.yeshuv || 'לא צוין'} | {mitcham.mispar_mitham ? `מתחם מס' ${mitcham.mispar_mitham}` : ''}
                  </p>
                </div>
                {getStatusBadge(mitcham.status)}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 border-y border-[#f0f2f4] dark:border-gray-800 py-4">
                <div>
                  <p className="text-xs text-[#617589] mb-1">יחידות קיימות</p>
                  <p className="text-lg font-bold">{mitcham.yachad_kayam || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-[#617589] mb-1">יחידות מוצעות</p>
                  <p className="text-lg font-bold">{mitcham.yachad_mutza || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-[#617589] mb-1">תוספת יחידות</p>
                  <p className="text-lg font-bold text-primary">
                    {mitcham.yachad_tosafti ? `+${mitcham.yachad_tosafti}` : '+0'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#617589] dark:text-gray-400">
                  {mitcham.taarich_hachraza && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-[#111418] dark:text-white">תאריך הכרזה:</span>
                      {formatDate(mitcham.taarich_hachraza)}
                    </div>
                  )}
                  {mitcham.mispar_tochnit && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-[#111418] dark:text-white">מספר תוכנית:</span>
                      {mitcham.mispar_tochnit}
                    </div>
                  )}
                  {mitcham.maslul && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-[#111418] dark:text-white">מסלול:</span>
                      {mitcham.maslul}
                    </div>
                  )}
                </div>
                {mitcham.kishur_latar && (
                  <a 
                    href={mitcham.kishur_latar} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                  >
                    צפייה בתוכנית המלאה
                    <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">domain</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            לא נמצאו מתחמים
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {hasActiveFilters 
              ? 'נסה לשנות את הסינון או החיפוש'
              : 'אין מתחמי התחדשות עירונית זמינים כרגע'
            }
          </p>
          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="outline">
              נקה סינון
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center items-center gap-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                  currentPage === pageNum 
                    ? 'bg-primary text-white font-bold border-primary' 
                    : ''
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className="mx-2">...</span>
          )}
          
          {totalPages > 5 && (
            <button
              onClick={() => handlePageChange(totalPages)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-bold transition-colors ${
                currentPage === totalPages 
                  ? 'bg-primary text-white border-primary' 
                  : ''
              }`}
            >
              {totalPages}
            </button>
          )}
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        </div>
      )}
    </div>
  )
}
