import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Filter, TrendingUp, TrendingDown, MapPin, Calendar, DollarSign, Home } from 'lucide-react'
import { dealQueries } from '@/lib/supabase-queries'
import type { Deal } from '@/lib/supabase'

export function DealsListings() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    city_name: '',
    property_type: '',
    min_price: '',
    max_price: '',
    min_area: '',
    max_area: '',
    min_rooms: '',
    max_rooms: ''
  })
  const [sortBy, setSortBy] = useState<'deal_date' | 'price_nis' | 'area_m2'>('deal_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch deals with filters
  const { data: deals, isLoading, error } = useQuery({
    queryKey: ['deals', filters, searchTerm, sortBy, sortOrder],
    queryFn: async () => {
      if (searchTerm) {
        return await dealQueries.search(searchTerm)
      }
      
      const filterParams = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      )
      
      // Convert string values to numbers where needed
      if (filterParams.min_price) filterParams.min_price = Number(filterParams.min_price)
      if (filterParams.max_price) filterParams.max_price = Number(filterParams.max_price)
      if (filterParams.min_area) filterParams.min_area = Number(filterParams.min_area)
      if (filterParams.max_area) filterParams.max_area = Number(filterParams.max_area)
      if (filterParams.min_rooms) filterParams.min_rooms = Number(filterParams.min_rooms)
      if (filterParams.max_rooms) filterParams.max_rooms = Number(filterParams.max_rooms)
      
      return await dealQueries.getFiltered(filterParams)
    }
  })

  // Get unique cities for filter
  const { data: allDeals, isLoading: isLoadingAllDeals } = useQuery({
    queryKey: ['all-deals'],
    queryFn: () => dealQueries.getAllPaginated()
  })

  const uniqueCities = Array.from(new Set(allDeals?.map(deal => deal.city_name) || [])).sort()
  const uniquePropertyTypes = Array.from(new Set(allDeals?.map(deal => deal.property_type).filter(Boolean) || [])).sort()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL').format(price) + ' ₪'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL')
  }

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />
    return null
  }

  const clearFilters = () => {
    setFilters({
      city_name: '',
      property_type: '',
      min_price: '',
      max_price: '',
      min_area: '',
      max_area: '',
      min_rooms: '',
      max_rooms: ''
    })
    setSearchTerm('')
  }

  if (isLoading || isLoadingAllDeals) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isLoadingAllDeals ? 'טוען את כל העסקאות...' : 'טוען עסקאות...'}
          </p>
          {isLoadingAllDeals && (
            <p className="text-sm text-muted-foreground mt-2">
              זה יכול לקחת כמה שניות בגלל כמות הנתונים הגדולה
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">שגיאה בטעינת העסקאות</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">עסקאות נדל״ן</h1>
        <p className="text-muted-foreground">מאגר עסקאות נדל״ן מעודכן לפי אזורים</p>
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
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="חיפוש לפי כתובת או מספר גוש/חלקה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={filters.city_name || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, city_name: value === "all" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="בחר עיר" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הערים</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.property_type || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, property_type: value === "all" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="סוג נכס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                {uniquePropertyTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="מחיר מינימלי"
              type="number"
              value={filters.min_price}
              onChange={(e) => setFilters(prev => ({ ...prev, min_price: e.target.value }))}
            />

            <Input
              placeholder="מחיר מקסימלי"
              type="number"
              value={filters.max_price}
              onChange={(e) => setFilters(prev => ({ ...prev, max_price: e.target.value }))}
            />

            <Input
              placeholder="שטח מינימלי (מ״ר)"
              type="number"
              value={filters.min_area}
              onChange={(e) => setFilters(prev => ({ ...prev, min_area: e.target.value }))}
            />

            <Input
              placeholder="שטח מקסימלי (מ״ר)"
              type="number"
              value={filters.max_area}
              onChange={(e) => setFilters(prev => ({ ...prev, max_area: e.target.value }))}
            />

            <Input
              placeholder="מספר חדרים מינימלי"
              type="number"
              value={filters.min_rooms}
              onChange={(e) => setFilters(prev => ({ ...prev, min_rooms: e.target.value }))}
            />

            <Input
              placeholder="מספר חדרים מקסימלי"
              type="number"
              value={filters.max_rooms}
              onChange={(e) => setFilters(prev => ({ ...prev, max_rooms: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={clearFilters} variant="outline">
              נקה סינונים
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">
          <p>נמצאו {deals?.length || 0} עסקאות</p>
          {allDeals && (
            <p className="text-sm">מתוך {allDeals.length.toLocaleString('he-IL')} עסקאות במאגר</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deal_date">תאריך עסקה</SelectItem>
              <SelectItem value="price_nis">מחיר</SelectItem>
              <SelectItem value="area_m2">שטח</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* Deals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>עיר</TableHead>
                  <TableHead>כתובת</TableHead>
                  <TableHead>סוג נכס</TableHead>
                  <TableHead>חדרים</TableHead>
                  <TableHead>שטח (מ״ר)</TableHead>
                  <TableHead>מחיר</TableHead>
                  <TableHead>תאריך עסקה</TableHead>
                  <TableHead>מגמה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals?.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {deal.city_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={deal.address}>
                        {deal.address || 'לא צוין'}
                      </div>
                      {deal.block_parcel_subparcel && (
                        <div className="text-xs text-muted-foreground">
                          {deal.block_parcel_subparcel}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {deal.property_type && (
                        <Badge variant="secondary">
                          <Home className="w-3 h-3 mr-1" />
                          {deal.property_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {deal.rooms ? `${deal.rooms} חדרים` : '-'}
                    </TableCell>
                    <TableCell>
                      {deal.area_m2 ? `${deal.area_m2} מ״ר` : '-'}
                    </TableCell>
                    <TableCell>
                      {deal.price_nis ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{formatPrice(deal.price_nis)}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {deal.deal_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(deal.deal_date)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {getTrendIcon(deal.trend)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {deals?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">לא נמצאו עסקאות המתאימות לקריטריונים</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
