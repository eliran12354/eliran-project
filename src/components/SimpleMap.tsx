import { useState } from 'react';

interface Property {
  id: number;
  x: number;
  y: number;
  title: string;
  address: string;
  price: string;
  status: 'available' | 'sold' | 'pending';
  type: string;
}

const properties: Property[] = [
  {
    id: 1,
    x: 180,
    y: 120,
    title: "דירת 4 חדרים בדיזנגוף",
    address: "רחוב דיזנגוף 100, תל אביב", 
    price: "₪3,200,000",
    status: 'available',
    type: 'דירה'
  },
  {
    id: 2,
    x: 280,
    y: 220,
    title: "פנטהאוס בנווה צדק",
    address: "שכונת נווה צדק, תל אביב",
    price: "₪5,800,000",
    status: 'pending',
    type: 'פנטהאוס'
  },
  {
    id: 3,
    x: 220,
    y: 280,
    title: "דירת 3 חדרים ברוטשילד",
    address: "שדרות רוטשילד 45, תל אביב",
    price: "₪2,900,000",
    status: 'sold',
    type: 'דירה'
  },
  {
    id: 4,
    x: 380,
    y: 160,
    title: "בית פרטי בצפון תל אביב",
    address: "רמת אביב צפון, תל אביב",
    price: "₪4,500,000",
    status: 'available',
    type: 'בית פרטי'
  },
  {
    id: 5,
    x: 140,
    y: 340,
    title: "דירה ליד הים בפלורנטין",
    address: "שכונת פלורנטין, תל אביב",
    price: "₪2,200,000",
    status: 'available',
    type: 'דירה'
  },
  {
    id: 6,
    x: 320,
    y: 240,
    title: "משרדים בעזריאלי",
    address: "מגדלי עזריאלי, תל אביב",
    price: "₪1,800,000",
    status: 'pending',
    type: 'משרדים'
  }
];

export function SimpleMap() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'sold':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  const getStatusText = (status: Property['status']) => {
    switch (status) {
      case 'available':
        return 'זמין למכירה';
      case 'sold':
        return 'נמכר';
      case 'pending':
        return 'בהמתנה';
      default:
        return 'זמין';
    }
  };

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-large border border-border/20 bg-gradient-to-br from-slate-50 to-blue-50 relative">
      {/* Google Maps style background with streets */}
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-30">
          {/* Main streets */}
          <line x1="0" y1="200" x2="100%" y2="200" stroke="#4a5568" strokeWidth="3"/>
          <line x1="200" y1="0" x2="200" y2="100%" stroke="#4a5568" strokeWidth="3"/>
          <line x1="0" y1="320" x2="100%" y2="320" stroke="#4a5568" strokeWidth="2"/>
          <line x1="350" y1="0" x2="350" y2="100%" stroke="#4a5568" strokeWidth="2"/>
          
          {/* Secondary streets */}
          <line x1="0" y1="120" x2="100%" y2="120" stroke="#718096" strokeWidth="1.5"/>
          <line x1="0" y1="280" x2="100%" y2="280" stroke="#718096" strokeWidth="1.5"/>
          <line x1="120" y1="0" x2="120" y2="100%" stroke="#718096" strokeWidth="1.5"/>
          <line x1="280" y1="0" x2="280" y2="100%" stroke="#718096" strokeWidth="1.5"/>
          
          {/* Small streets */}
          {Array.from({length: 8}).map((_, i) => (
            <g key={i}>
              <line x1="0" y1={60 + i * 60} x2="100%" y2={60 + i * 60} stroke="#a0aec0" strokeWidth="1" opacity="0.7"/>
              <line x1={60 + i * 50} y1="0" x2={60 + i * 50} y2="100%" stroke="#a0aec0" strokeWidth="1" opacity="0.7"/>
            </g>
          ))}
        </svg>
      </div>

      {/* Buildings and parks */}
      <div className="absolute inset-0">
        {/* Parks */}
        <div className="absolute top-8 left-8 w-16 h-12 bg-green-200 rounded opacity-60"></div>
        <div className="absolute bottom-16 right-12 w-20 h-16 bg-green-200 rounded opacity-60"></div>
        
        {/* Buildings */}
        <div className="absolute top-16 left-32 w-8 h-6 bg-gray-300 rounded-sm opacity-50"></div>
        <div className="absolute top-24 right-24 w-12 h-8 bg-gray-300 rounded-sm opacity-50"></div>
        <div className="absolute bottom-24 left-16 w-10 h-14 bg-gray-300 rounded-sm opacity-50"></div>
        <div className="absolute bottom-32 right-32 w-14 h-10 bg-gray-300 rounded-sm opacity-50"></div>
      </div>
      
      {/* Street Names */}
      <div className="absolute top-16 left-24 text-xs font-semibold text-slate-600 bg-white/80 px-2 py-1 rounded shadow-sm">
        רח׳ דיזנגוף
      </div>
      <div className="absolute bottom-20 right-28 text-xs font-semibold text-slate-600 bg-white/80 px-2 py-1 rounded shadow-sm">
        שד׳ רוטשילד  
      </div>
      <div className="absolute top-32 right-16 text-xs font-semibold text-slate-600 bg-white/80 px-2 py-1 rounded shadow-sm">
        נווה צדק
      </div>
      <div className="absolute top-20 left-64 text-xs font-semibold text-slate-600 bg-white/80 px-2 py-1 rounded shadow-sm">
        רמת אביב
      </div>
      
      {/* Property Markers - Google style */}
      {properties.map((property) => (
        <div
          key={property.id}
          className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-full z-20 hover:scale-110 transition-transform duration-200"
          style={{
            left: `${property.x}px`,
            top: `${property.y}px`,
          }}
          onClick={() => setSelectedProperty(property)}
        >
          {/* Google Maps style pin */}
          <div className="relative">
            <svg width="28" height="36" viewBox="0 0 28 36" className="drop-shadow-lg">
              <path 
                fill={
                  property.status === 'available' ? '#34a853' :
                  property.status === 'sold' ? '#ea4335' : '#fbbc04'
                }
                stroke="#ffffff" 
                strokeWidth="2" 
                d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z"
              />
              <circle fill="#ffffff" cx="14" cy="14" r="6"/>
              <circle 
                fill={
                  property.status === 'available' ? '#34a853' :
                  property.status === 'sold' ? '#ea4335' : '#fbbc04'
                } 
                cx="14" cy="14" r="3"
              />
            </svg>
            
            {/* Pulse animation for available properties */}
            {property.status === 'available' && (
              <div className="absolute top-2 left-2 w-6 h-6 bg-green-400 rounded-full opacity-30 animate-ping"></div>
            )}
          </div>
        </div>
      ))}

      {/* Property Details Popup - Google style */}
      {selectedProperty && (
        <div 
          className="absolute z-30 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{
            left: `${Math.min(selectedProperty.x + 20, 350)}px`,
            top: `${Math.max(selectedProperty.y - 200, 20)}px`,
            width: '320px'
          }}
          dir="rtl"
        >
          {/* Property image placeholder */}
          <div className="h-32 bg-gradient-to-r from-blue-400 to-green-400 flex items-center justify-center">
            <span className="text-4xl">🏠</span>
          </div>
          
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-gray-900 leading-tight pr-6">{selectedProperty.title}</h3>
              <button 
                onClick={() => setSelectedProperty(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-gray-600">
                <span className="text-base mt-0.5">📍</span>
                <span className="leading-relaxed">{selectedProperty.address}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <span className="font-bold text-primary text-lg">{selectedProperty.price}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-base">🏠</span>
                  <span className="font-medium">{selectedProperty.type}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  selectedProperty.status === 'available' ? 'text-green-700 bg-green-50 border-green-200' :
                  selectedProperty.status === 'sold' ? 'text-red-700 bg-red-50 border-red-200' :
                  'text-yellow-700 bg-yellow-50 border-yellow-200'
                }`}>
                  {getStatusText(selectedProperty.status)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-white text-primary border-2 border-primary py-2.5 px-4 rounded-lg hover:bg-primary/5 transition-colors font-medium text-sm">
                הכוונה
              </button>
              <button className="flex-1 bg-primary text-white py-2.5 px-4 rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm">
                פרטים נוספים
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Google Maps style controls */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 border-b border-gray-200 text-gray-600 font-bold text-lg transition-colors">
            +
          </button>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold text-xl transition-colors">
            −
          </button>
        </div>
      </div>

      {/* Map type toggle */}
      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-1.5">
          <button className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">לוויין</button>
        </div>
      </div>
      
      {/* Map Legend - Google style */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 z-10" dir="rtl">
        <div className="font-medium mb-3 text-gray-900 text-sm">נכסים זמינים</div>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700">זמין למכירה ({properties.filter(p => p.status === 'available').length})</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700">נמכר ({properties.filter(p => p.status === 'sold').length})</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-700">בהמתנה ({properties.filter(p => p.status === 'pending').length})</span>
          </div>
        </div>
      </div>
    </div>
  );
}