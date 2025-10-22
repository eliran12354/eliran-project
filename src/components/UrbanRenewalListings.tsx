import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Building2, MapPin, Calendar, Users, ExternalLink, Filter, X } from 'lucide-react'
import { urbanRenewalProjectQueries } from '@/lib/supabase-queries'
import type { UrbanRenewalProject } from '@/lib/supabase'

export function UrbanRenewalListings() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    city_name: '',
    project_type: '',
    project_subtype: '',
    status_code: '',
    min_units: '',
    max_units: ''
  })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch projects with filters
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['urban-renewal-projects', filters, searchTerm, sortBy, sortOrder],
    queryFn: async () => {
      if (searchTerm) {
        return await urbanRenewalProjectQueries.search(searchTerm)
      }
      
      const filterParams = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      )
      
      // Convert string values to numbers where needed
      if (filterParams.min_units) filterParams.min_units = Number(filterParams.min_units)
      if (filterParams.max_units) filterParams.max_units = Number(filterParams.max_units)
      if (filterParams.status_code) filterParams.status_code = Number(filterParams.status_code)
      
      return await urbanRenewalProjectQueries.getFiltered(filterParams)
    }
  })

  // Get unique values for filters
  const { data: allProjects, isLoading: isLoadingAllProjects } = useQuery({
    queryKey: ['all-urban-renewal-projects'],
    queryFn: () => urbanRenewalProjectQueries.getAll()
  })

  const uniqueCities = Array.from(new Set(allProjects?.map(project => project.city_name).filter(Boolean) || [])).sort()
  const uniqueTypes = Array.from(new Set(allProjects?.map(project => project.project_type).filter(Boolean) || [])).sort()
  const uniqueSubtypes = Array.from(new Set(allProjects?.map(project => project.project_subtype).filter(Boolean) || [])).sort()

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL')
  }

  const getStatusBadge = (statusCode?: number) => {
    if (!statusCode) return <Badge variant="secondary">לא ידוע</Badge>
    
    switch (statusCode) {
      case 1:
        return <Badge variant="default" className="bg-green-500">פעיל</Badge>
      case 2:
        return <Badge variant="secondary">בתכנון</Badge>
      case 3:
        return <Badge variant="destructive">הושלם</Badge>
      default:
        return <Badge variant="outline">קוד {statusCode}</Badge>
    }
  }

  const clearFilters = () => {
    setFilters({
      city_name: '',
      project_type: '',
      project_subtype: '',
      status_code: '',
      min_units: '',
      max_units: ''
    })
    setSearchTerm('')
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '') || searchTerm !== ''

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
        שגיאה בטעינת הפרויקטים: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">פרויקטי התחדשות עירונית</h1>
          <p className="text-gray-600 mt-2">
            {projects?.length || 0} פרויקטים נמצאו
          </p>
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
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="חיפוש לפי שם פרויקט, עיר, מספר פרויקט..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10"
              />
            </div>
            <Button onClick={() => setSearchTerm('')} variant="outline" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">עיר</label>
              <Select value={filters.city_name || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, city_name: value === "all" ? "" : value }))}>
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">סוג פרויקט</label>
              <Select value={filters.project_type || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, project_type: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="כל הסוגים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">תת-סוג</label>
              <Select value={filters.project_subtype || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, project_subtype: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="כל התת-סוגים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התת-סוגים</SelectItem>
                  {uniqueSubtypes.map(subtype => (
                    <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>
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
                onChange={(e) => setFilters(prev => ({ ...prev, min_units: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">יחידות מקסימום</label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.max_units}
                onChange={(e) => setFilters(prev => ({ ...prev, max_units: e.target.value }))}
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
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {project.project_name || 'ללא שם פרויקט'}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {project.city_name || 'לא צוין'}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(project.status_code)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.project_number && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">מספר פרויקט:</span>
                    <span className="text-sm text-gray-600">{project.project_number}</span>
                  </div>
                )}

                {project.project_type && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{project.project_type}</span>
                  </div>
                )}

                {project.project_subtype && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">תת-סוג:</span> {project.project_subtype}
                  </div>
                )}

                {(project.existing_units || project.proposed_units || project.additional_units) && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <div className="text-sm text-gray-600">
                      {project.existing_units && (
                        <span>קיים: {project.existing_units}</span>
                      )}
                      {project.proposed_units && (
                        <span className="mx-1">• מוצע: {project.proposed_units}</span>
                      )}
                      {project.additional_units && (
                        <span className="mx-1">• נוסף: {project.additional_units}</span>
                      )}
                    </div>
                  </div>
                )}

                {project.valid_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      תאריך תקף: {formatDate(project.valid_date)}
                    </span>
                  </div>
                )}

                {project.plan_link && (
                  <div className="pt-2">
                    <a
                      href={project.plan_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-4 h-4" />
                      קישור לתוכנית
                    </a>
                  </div>
                )}

                {project.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {project.notes}
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
              לא נמצאו פרויקטים
            </h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters 
                ? 'נסה לשנות את הסינון או החיפוש'
                : 'אין פרויקטי התחדשות עירונית זמינים כרגע'
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
    </div>
  )
}
