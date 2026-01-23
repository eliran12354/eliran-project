import { ResidentialInventoryListings } from '@/components/ResidentialInventoryListings'
import { Link } from 'react-router-dom'

export default function ResidentialInventoryPage() {
  return (
    <div className="w-full" dir="rtl">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-6">
          <Link className="text-[#617589] dark:text-gray-400 text-sm font-medium hover:text-primary transition-colors" to="/">
            דף הבית
          </Link>
          <span className="material-symbols-outlined text-sm text-[#617589]">chevron_left</span>
          <span className="text-[#111418] dark:text-white text-sm font-semibold">מלאי תכנוני למגורים</span>
        </nav>

        {/* Headline */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <span className="material-symbols-outlined text-3xl">inventory_2</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-display">מלאי תכנוני למגורים</h1>
        </div>

        {/* Listings Component */}
        <ResidentialInventoryListings />
      </div>
    </div>
  )
}
