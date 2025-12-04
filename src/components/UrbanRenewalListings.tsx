import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Building2, MapPin, Calendar, Users, ExternalLink, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { urbanRenewalMitchamimQueries } from '@/lib/supabase-queries'
import type { UrbanRenewalMitchamim } from '@/lib/supabase'

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

  // Fetch mitchamim with filters
  const { data: mitchamimData, isLoading, error } = useQuery({
    queryKey: ['urban-renewal-mitchamim', filters, searchQuery, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      if (searchQuery) {
        return await urbanRenewalMitchamimQueries.search(searchQuery, currentPage, itemsPerPage, sortBy, sortOrder)
      }
      
      const filterParams = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      )
      
      // Convert string values to numbers where needed
      if (filterParams.min_units) filterParams.min_units = Number(filterParams.min_units)
      if (filterParams.max_units) filterParams.max_units = Number(filterParams.max_units)
      
      return await urbanRenewalMitchamimQueries.getFiltered(filterParams, currentPage, itemsPerPage, sortBy, sortOrder)
    }
  })

  const mitchamim = mitchamimData?.data || []
  const totalMitchamim = mitchamimData?.total || 0
  const totalPages = Math.ceil(totalMitchamim / itemsPerPage)

  // Get unique values for filters
  const { data: allMitchamim, isLoading: isLoadingAllMitchamim } = useQuery({
    queryKey: ['all-urban-renewal-mitchamim'],
    queryFn: () => urbanRenewalMitchamimQueries.getAll()
  })

  const uniqueCities = Array.from(new Set(allMitchamim?.map(m => m.yeshuv).filter(Boolean) || [])).sort()
  const uniqueStatuses = Array.from(new Set(allMitchamim?.map(m => m.status).filter(Boolean) || [])).sort()

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL')
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">לא ידוע</Badge>
    
    return <Badge variant="outline">{status}</Badge>
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
        שגיאה בטעינת המתחמים: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">מתחמי התחדשות עירונית</h1>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            חיפוש וסינון
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="חיפוש לפי שם מתחם, עיר, מספר תוכנית..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="h-10 pr-10"
              />
            </div>
            <Button onClick={handleSearch} className="gap-2">
              <Search className="w-4 h-4" />
              חפש
            </Button>
            {searchTerm && (
              <Button onClick={() => {
                setSearchTerm('')
                setSearchQuery('')
              }} variant="outline" size="sm">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">עיר</label>
              <Select value={filters.yeshuv || "all"} onValueChange={(value) => {
                setFilters(prev => ({ ...prev, yeshuv: value === "all" ? "" : value }))
                setCurrentPage(1)
              }}>
                <SelectTrigger>
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

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">סטטוס</label>
              <Select value={filters.status || "all"} onValueChange={(value) => {
                setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))
                setCurrentPage(1)
              }}>
                <SelectTrigger>
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

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">יחידות מינימום</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.min_units}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, min_units: e.target.value }))
                  setCurrentPage(1)
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">יחידות מקסימום</label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.max_units}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, max_units: e.target.value }))
                  setCurrentPage(1)
                }}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full">
                <X className="w-4 h-4 mr-2" />
                נקה סינון
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {mitchamim && mitchamim.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mitchamim.map((mitcham) => (
            <Card key={mitcham.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {mitcham.shem_mitcham || `מתחם ${mitcham.mispar_mitham}`}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {mitcham.yeshuv || 'לא צוין'}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(mitcham.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mitcham.mispar_mitham && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">מספר מתחם:</span>
                    <span className="text-sm text-gray-600">{mitcham.mispar_mitham}</span>
                  </div>
                )}

                {mitcham.mispar_tochnit && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">מספר תוכנית: {mitcham.mispar_tochnit}</span>
                  </div>
                )}

                {(mitcham.yachad_kayam || mitcham.yachad_tosafti || mitcham.yachad_mutza) && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <div className="text-sm text-gray-600">
                      {mitcham.yachad_kayam && (
                        <span>קיים: {mitcham.yachad_kayam}</span>
                      )}
                      {mitcham.yachad_tosafti && (
                        <span className="mx-1">• תוספתי: {mitcham.yachad_tosafti}</span>
                      )}
                      {mitcham.yachad_mutza && (
                        <span className="mx-1">• מצוי: {mitcham.yachad_mutza}</span>
                      )}
                    </div>
                  </div>
                )}

                {mitcham.taarich_hachraza && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      תאריך החרזה: {formatDate(mitcham.taarich_hachraza)}
                    </span>
                  </div>
                )}

                {mitcham.kishur_latar && (
                  <div className="pt-2">
                    <a
                      href={mitcham.kishur_latar}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-4 h-4" />
                      קישור לתוכנית
                    </a>
                  </div>
                )}

                {mitcham.maslul && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      <span className="font-medium">מסלול:</span> {mitcham.maslul}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              לא נמצאו מתחמים
            </h3>
            <p className="text-gray-600 mb-4">
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
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 pt-8 pb-4">
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            עמוד קודם
          </Button>
          
          <div className="flex items-center space-x-2">
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
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => handlePageChange(pageNum)}
                  className="w-10 h-10"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2"
          >
            עמוד הבא
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
