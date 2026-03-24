import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Backend API URL
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

// סדר והקבצה של שדות מלאי תכנוני למגורים (מפתחות בעברית מהמערכת)
const RESIDENTIAL_INVENTORY_FIELDS: Array<{ key: string; category: 'basic' | 'project' | 'units' | 'dates' | 'links' | 'other' }> = [
  { key: 'יישוב', category: 'basic' },
  { key: 'סמל יישוב', category: 'basic' },
  { key: 'מפתח לפוליגון תכנית', category: 'basic' },
  { key: 'מספר תוכנית', category: 'project' },
  { key: 'שם תוכנית', category: 'project' },
  { key: 'שלב תכנוני', category: 'project' },
  { key: 'יזם תכנון', category: 'project' },
  { key: 'יחד פוטנציאל לשיווק', category: 'units' },
  { key: 'תאריך קיום תנאי סף', category: 'dates' },
  { key: 'קישור לאתר רשות מקרקעי ישראל', category: 'links' },
  { key: 'קישור לאתר מנהל תכנון', category: 'links' },
];

// Fetch residential inventory data from backend (which uses data.gov.il API)
async function fetchResidentialInventory(options: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}) {
  const response = await fetch(`${BACKEND_API_URL}/api/datagov/residential-inventory`, {
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
    throw new Error(result.message || 'Failed to fetch residential inventory');
  }

  return {
    data: result.data || [],
    total: result.total || 0,
  };
}

export function ResidentialInventoryListings() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Fetch data with pagination
  const { data: inventoryData, isLoading, error } = useQuery({
    queryKey: ['residential-inventory', searchQuery, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;
      return await fetchResidentialInventory({
        limit: itemsPerPage,
        offset,
        search: searchQuery || undefined,
      });
    }
  })

  const inventory = inventoryData?.data || []
  const totalItems = inventoryData?.total || 0
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Debug: Log first record structure
  if (inventory.length > 0 && process.env.NODE_ENV === 'development') {
    console.log('📋 First record keys:', Object.keys(inventory[0]));
    console.log('📋 First record sample:', JSON.stringify(inventory[0]).substring(0, 1000));
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
    setSearchTerm('')
    setSearchQuery('')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery !== ''

  // שמות השדות מגיעים בעברית מהמערכת – מציגים כפי שהם (אין צורך במיפוי)
  const getFieldLabel = (key: string): string => {
    if (key === '_id') return 'מזהה';
    return key.replace(/^_original_/, '');
  };

  // הקבצת שדות לפי קטגוריות – לפי מבנה מלאי תכנוני למגורים (מפתחות בעברית)
  const groupFields = (item: any) => {
    const groups: Record<string, Array<{ key: string; value: any }>> = {
      basic: [],
      project: [],
      units: [],
      dates: [],
      links: [],
      other: [],
    };
    const processedKeys = new Set<string>();

    for (const { key, category } of RESIDENTIAL_INVENTORY_FIELDS) {
      if (!item.hasOwnProperty(key)) continue;
      const value = item[key];
      if (value === null || value === undefined || value === '') continue;
      groups[category].push({ key, value });
      processedKeys.add(key);
    }

    Object.keys(item).forEach(key => {
      if (processedKeys.has(key) || key === '_id') return;
      const value = item[key];
      if (value === null || value === undefined || value === '') return;
      groups.other.push({ key, value });
    });

    return groups;
  };

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'כן' : 'לא';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

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
        שגיאה בטעינת הנתונים: {error instanceof Error ? error.message : 'שגיאה לא ידועה'}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Search Area */}
      <section className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">search</span>
          חיפוש
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">חיפוש חופשי</label>
            <Input
              placeholder="הזן מילות חיפוש..."
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
          <Button 
            onClick={handleSearch} 
            className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 h-12"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            חיפוש
          </Button>
          {hasActiveFilters && (
            <Button 
              onClick={clearFilters} 
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-8 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors h-12"
            >
              ניקוי
            </Button>
          )}
        </div>
      </section>

      {/* Results Header */}
      {inventory && inventory.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[#617589] dark:text-gray-400 font-medium">
            מציג {inventory.length} מתוך {totalItems} רשומות שנמצאו
          </p>
        </div>
      )}

      {/* Results List */}
      {inventory && inventory.length > 0 ? (
        <div className="space-y-4">
          {inventory.map((item: any, index: number) => {
            const groups = groupFields(item);
            const recordNumber = index + 1 + (currentPage - 1) * itemsPerPage;
            
            // כותרת: שם תוכנית או יישוב (מבנה הנתונים – מפתחות בעברית)
            const mainTitle = item['שם תוכנית'] || item['יישוב'] || `רשומה #${recordNumber}`;
            
            return (
              <article 
                key={item._id || index} 
                className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors"
              >
                {/* Header */}
                <div className="mb-6 pb-4 border-b border-[#f0f2f4] dark:border-gray-800">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-xl font-bold text-[#111418] dark:text-white">
                      {mainTitle}
                    </h4>
                    <span className="text-xs text-[#617589] dark:text-gray-400 font-medium">
                      {Object.values(groups).reduce((sum, group) => sum + group.length, 0)} שדות
                    </span>
                  </div>
                  {groups.basic.length > 0 && (
                    <div className="flex flex-wrap gap-4 text-sm text-[#617589] dark:text-gray-400">
                      {groups.basic.slice(0, 3).map(({ key, value }) => (
                        <span key={key} className="flex items-center gap-1">
                          <span className="font-semibold">{getFieldLabel(key)}:</span>
                          <span>{formatValue(value)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Main Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {/* Basic Information */}
                  {groups.basic.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">info</span>
                        פרטים בסיסיים
                        <span className="text-xs font-normal text-gray-500">({groups.basic.length})</span>
                      </h5>
                      {groups.basic.map(({ key, value }) => (
                        <div key={key} className="border-b border-[#f0f2f4] dark:border-gray-800 pb-2 last:border-0">
                          <p className="text-xs text-[#617589] dark:text-gray-400 mb-1 font-semibold">
                            {getFieldLabel(key)}
                          </p>
                          <p className="text-sm font-medium text-[#111418] dark:text-white break-words">
                            {formatValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Units Information */}
                  {groups.units.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">home</span>
                        יחידות דיור
                        <span className="text-xs font-normal text-gray-500">({groups.units.length})</span>
                      </h5>
                      {groups.units.map(({ key, value }) => (
                        <div key={key} className="border-b border-[#f0f2f4] dark:border-gray-800 pb-2 last:border-0">
                          <p className="text-xs text-[#617589] dark:text-gray-400 mb-1 font-semibold">
                            {getFieldLabel(key)}
                          </p>
                          <p className="text-sm font-medium text-[#111418] dark:text-white break-words">
                            {formatValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Project Details */}
                  {groups.project.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">description</span>
                        פרטי פרויקט
                        <span className="text-xs font-normal text-gray-500">({groups.project.length})</span>
                      </h5>
                      {groups.project.map(({ key, value }) => (
                        <div key={key} className="border-b border-[#f0f2f4] dark:border-gray-800 pb-2 last:border-0">
                          <p className="text-xs text-[#617589] dark:text-gray-400 mb-1 font-semibold">
                            {getFieldLabel(key)}
                          </p>
                          <p className="text-sm font-medium text-[#111418] dark:text-white break-words">
                            {formatValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dates and Links */}
                {(groups.dates.length > 0 || groups.links.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-4 border-t border-[#f0f2f4] dark:border-gray-800">
                    {groups.dates.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">calendar_today</span>
                          תאריכים
                          <span className="text-xs font-normal text-gray-500">({groups.dates.length})</span>
                        </h5>
                        {groups.dates.map(({ key, value }) => (
                          <div key={key} className="border-b border-[#f0f2f4] dark:border-gray-800 pb-2 last:border-0">
                            <p className="text-xs text-[#617589] dark:text-gray-400 mb-1 font-semibold">
                              {getFieldLabel(key)}
                            </p>
                            <p className="text-sm font-medium text-[#111418] dark:text-white break-words">
                              {formatValue(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {groups.links.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">link</span>
                          קישורים
                          <span className="text-xs font-normal text-gray-500">({groups.links.length})</span>
                        </h5>
                        {groups.links.map(({ key, value }) => {
                          const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
                          return (
                            <div key={key} className="border-b border-[#f0f2f4] dark:border-gray-800 pb-2 last:border-0 min-w-0 overflow-hidden">
                              <p className="text-xs text-[#617589] dark:text-gray-400 mb-1 font-semibold">
                                {getFieldLabel(key)}
                              </p>
                              {isUrl ? (
                                <a
                                  href={value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-primary hover:underline break-all block max-w-full"
                                >
                                  {value}
                                  <span className="material-symbols-outlined text-sm inline-block mr-1">open_in_new</span>
                                </a>
                              ) : (
                                <p className="text-sm font-medium text-[#111418] dark:text-white break-words">
                                  {formatValue(value)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">inventory_2</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            לא נמצאו רשומות
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {hasActiveFilters 
              ? 'נסה לשנות את החיפוש'
              : 'אין נתונים זמינים כרגע'
            }
          </p>
          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="outline">
              נקה חיפוש
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
