import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, FileText, MapPin, Calendar, DollarSign, Building2, Filter, X, ChevronLeft, ChevronRight, Phone, Mail, CreditCard, Maximize2, ExternalLink } from 'lucide-react'
import { telegramDocumentQueries } from '@/lib/supabase-queries'
import type { TelegramDocument } from '@/lib/supabase'

export function TelegramDocumentsListings() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    document_type: '',
    location_city: '',
    property_type: '',
    processing_status: '',
    min_total_area: '',
    max_total_area: '',
    min_deposit: '',
    max_deposit: ''
  })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Fetch documents with filters
  const { data: documentsData, isLoading, error } = useQuery({
    queryKey: ['telegram-documents', filters, searchQuery, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      if (searchQuery) {
        return await telegramDocumentQueries.search(searchQuery, currentPage, itemsPerPage, sortBy, sortOrder)
      }
      
      const filterParams = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      )
      
      // Convert string values to numbers where needed
      if (filterParams.min_total_area) filterParams.min_total_area = Number(filterParams.min_total_area)
      if (filterParams.max_total_area) filterParams.max_total_area = Number(filterParams.max_total_area)
      if (filterParams.min_deposit) filterParams.min_deposit = Number(filterParams.min_deposit)
      if (filterParams.max_deposit) filterParams.max_deposit = Number(filterParams.max_deposit)
      
      return await telegramDocumentQueries.getFiltered(filterParams, currentPage, itemsPerPage, sortBy, sortOrder)
    }
  })

  const documents = documentsData?.data || []
  const totalDocuments = documentsData?.total || 0
  const totalPages = Math.ceil(totalDocuments / itemsPerPage)

  // Get unique values for filters
  const { data: allDocuments, isLoading: isLoadingAllDocuments } = useQuery({
    queryKey: ['all-telegram-documents'],
    queryFn: () => telegramDocumentQueries.getAll()
  })

  const uniqueCities = Array.from(new Set(allDocuments?.map(doc => doc.location_city).filter(Boolean) || [])).sort()
  const uniqueDocumentTypes = Array.from(new Set(allDocuments?.map(doc => doc.document_type).filter(Boolean) || [])).sort()
  const uniquePropertyTypes = Array.from(new Set(allDocuments?.map(doc => doc.property_type).filter(Boolean) || [])).sort()
  const uniqueStatuses = Array.from(new Set(allDocuments?.map(doc => doc.processing_status).filter(Boolean) || [])).sort()

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL')
  }

  const formatCurrency = (amount: number | null | undefined, currency?: string | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('he-IL').format(amount) + (currency ? ` ${currency}` : '')
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">לא ידוע</Badge>
    
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary">ממתין לעיבוד</Badge>
      case 'processed':
      case 'completed':
        return <Badge variant="default" className="bg-green-500">עובד</Badge>
      case 'error':
      case 'failed':
        return <Badge variant="destructive">שגיאה</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
      document_type: '',
      location_city: '',
      property_type: '',
      processing_status: '',
      min_total_area: '',
      max_total_area: '',
      min_deposit: '',
      max_deposit: ''
    })
    setSearchTerm('')
    setSearchQuery('')
    setCurrentPage(1)
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '') || searchQuery !== ''


  if (isLoading || isLoadingAllDocuments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12" dir="rtl">
        <p className="text-red-500 mb-2">אירעה שגיאה בטעינת המכרזים</p>
        <p className="text-muted-foreground">נסה לרענן את העמוד או לנסות שוב מאוחר יותר.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold">מכרזי הוצאה לפועל</h2>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2" dir="rtl">
            <span className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              חיפוש וסינון
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-row-reverse">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="חיפוש לפי עיר, כתובת, סוג מסמך, מספר תיק, מספר חלקה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="pr-10"
                dir="rtl"
              />
            </div>
            <Button onClick={handleSearch} className="gap-2 h-10 px-6 w-full sm:w-auto">
              חפש
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents Cards */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Card key={doc.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-gradient-card shadow-soft border-0">
              {/* Image */}
              {doc.image_url ? (
                <div className="relative w-full min-h-[600px] max-h-[800px] bg-gray-100 overflow-auto flex items-center justify-center group">
                  <img
                    src={doc.image_url}
                    alt={`מסמך ${doc.id}`}
                    className="w-full h-auto max-w-full object-contain cursor-pointer transition-transform duration-300"
                    onClick={() => {
                      setSelectedImage(doc.image_url)
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3Eתמונה לא זמינה%3C/text%3E%3C/svg%3E'
                    }}
                  />
                  {/* Overlay with buttons */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImage(doc.image_url)
                        }}
                      >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        תצוגה מלאה
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(doc.image_url, '_blank', 'noopener,noreferrer')
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        פתח בחלון חדש
                      </Button>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(doc.processing_status)}
                  </div>
                  {doc.document_type && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-white/90">
                        <FileText className="w-3 h-3 mr-1" />
                        {doc.document_type}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">
                  <FileText className="w-12 h-12 text-gray-300" />
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {doc.location_city && (
                      <CardTitle className="text-lg line-clamp-2 mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          {doc.location_city}
                        </div>
                      </CardTitle>
                    )}
                    {doc.location_address && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {doc.location_address}
                      </p>
                    )}
                    {doc.court_file_number && (
                      <Badge variant="outline" className="text-xs">
                        תיק #{doc.court_file_number}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Property Type */}
                {doc.property_type && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{doc.property_type}</span>
                  </div>
                )}

                {/* Area */}
                {(doc.total_area_sqm || doc.building_area_sqm) && (
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      {doc.total_area_sqm && (
                        <span className="font-medium">שטח כולל: {doc.total_area_sqm} מ״ר</span>
                      )}
                      {doc.building_area_sqm && (
                        <span className="text-muted-foreground mr-2">
                          {doc.total_area_sqm ? ' • ' : ''}בנייה: {doc.building_area_sqm} מ״ר
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Deposit */}
                {doc.deposit_amount && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      פיקדון: {formatCurrency(doc.deposit_amount, doc.deposit_currency)}
                    </span>
                  </div>
                )}

                {/* Submission Deadline */}
                {doc.submission_deadline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-gray-600">
                      תאריך הגשה: {formatDate(doc.submission_deadline)}
                    </span>
                  </div>
                )}

                {/* Contact Info */}
                {(doc.contact_name || doc.contact_phone || doc.contact_email) && (
                  <div className="pt-2 border-t space-y-1">
                    {doc.contact_name && (
                      <div className="text-sm font-medium text-gray-700">{doc.contact_name}</div>
                    )}
                    {doc.contact_phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {doc.contact_phone}
                      </div>
                    )}
                    {doc.contact_email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {doc.contact_email}
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Info */}
                {(doc.parcel_number || doc.block_number) && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    {doc.parcel_number && <div>חלקה: {doc.parcel_number}</div>}
                    {doc.block_number && <div>גוש: {doc.block_number}</div>}
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}


      {documents.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              לא נמצאו מסמכים
            </h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters 
                ? 'נסה לשנות את הסינון או החיפוש'
                : 'אין מסמכי כונס נכסים זמינים כרגע'
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

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>תצוגה מלאה של המסמך</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center bg-gray-100 rounded-lg overflow-auto">
              <img
                src={selectedImage}
                alt="תצוגה מלאה"
                className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                onClick={() => {
                  window.open(selectedImage, '_blank', 'noopener,noreferrer')
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3Eתמונה לא זמינה%3C/text%3E%3C/svg%3E'
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-4 right-4 bg-white/90 hover:bg-white"
                onClick={() => {
                  window.open(selectedImage, '_blank', 'noopener,noreferrer')
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                פתח בחלון חדש
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 md:gap-0 md:space-x-4 pt-8 pb-4">
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
