import { useState } from "react";

export default function GovMapPage() {
  // Search state - גוש וחלקה
  const [gush, setGush] = useState<string>("");
  const [helka, setHelka] = useState<string>("");
  // Search state - כתובת ועיר
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [searchError, setSearchError] = useState<string | null>(null);

  // בחירה בין תצוגת גושים, חלקות, יעודי קרקע - מבא"ת, התחדשות עירונית, תוכניות בהכנה,
  // סוג בעלות בחלקות רשומות, מגרשים - משרד הבינוי, תוכניות לשיווק - רמ"י, מגרשי תעשייה באזורי פיתוח
  // ומלאי תכנוני למגורים ב־iframe המוטמעת
  // עכשיו תומך בבחירת כמה שכבות בו-זמנית
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set(['gushim']));
  // URL מותאם אישית (למשל לפי גוש/חלקה) עבור ה־iframe
  const [embedCustomUrl, setEmbedCustomUrl] = useState<string | null>(null);

  // מיפוי של שכבות ל-layer IDs ב-GovMap
  const layerIds: Record<string, number> = {
    gushim: 21,
    parcels: 15,
    landUseMavat: 14,
    urbanRenewal: 200720,
    preparingPlans: 50,
    ownershipType: 6,
    migrazimHousing: 335,
    marketingPlans: 359,
    industrialPlots: 143,
    residentialInventory: 340,
    realEstateDeals: 16,
    tma70Metro: 201,
  };

  // Center coordinates (משתמשים ב-default center)
  const defaultCenter = '219143.61%2C618345.06';

  // בונים URL עם כל השכבות הנבחרות
  const buildEmbedUrl = (): string => {
    // אם יש URL מותאם אישית (למשל מחיפוש), משתמשים בו
    if (embedCustomUrl) {
      return embedCustomUrl;
    }

    // בונים URL עם כל השכבות הנבחרות
    const selectedLayerIds = Array.from(selectedLayers)
      .map((layer) => layerIds[layer])
      .filter((id) => id !== undefined);

    if (selectedLayerIds.length === 0) {
      // אם אין שכבות נבחרות, מציגים את גושים כברירת מחדל
      return `https://www.govmap.gov.il?c=${defaultCenter}&lay=21&bb=1&zb=1&in=1`;
    }

    // בונים URL עם כל השכבות - GovMap תומך בכמה lay parameters
    const layParams = selectedLayerIds.map((id) => `lay=${id}`).join('&');
    return `https://www.govmap.gov.il?c=${defaultCenter}&${layParams}&bb=1&zb=1&in=1`;
  };

  const embedSrc = buildEmbedUrl();

  // פונקציה לטוגל שכבה (הוספה/הסרה)
  const toggleLayer = (layer: string) => {
    setSelectedLayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(layer)) {
        newSet.delete(layer);
        // אם אין שכבות נבחרות, משאירים לפחות אחת (גושים)
        if (newSet.size === 0) {
          newSet.add('gushim');
        }
      } else {
        newSet.add(layer);
      }
      return newSet;
    });
    // איפוס URL מותאם אישית כשמחליפים שכבות
    setEmbedCustomUrl(null);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-6 border-b border-border/20">
        <h1 className="text-3xl font-bold text-primary mb-2">מפת GovMap</h1>

        
        {/* Search form - מעל התיבה */}
        <div className="mb-4" dir="rtl">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="gush" className="block text-sm font-medium text-gray-700 mb-1">
                גוש
              </label>
              <input
                id="gush"
                type="number"
                value={gush}
                onChange={(e) => setGush(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // אפשר להוסיף כאן לוגיקה אם צריך
                  }
                }}
                placeholder="לדוגמה: 30502"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="helka" className="block text-sm font-medium text-gray-700 mb-1">
                חלקה
              </label>
              <input
                id="helka"
                type="number"
                value={helka}
                onChange={(e) => setHelka(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // אפשר להוסיף כאן לוגיקה אם צריך
                  }
                }}
                placeholder="לדוגמה: 42"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!gush || !helka) {
                  setSearchError("נא להזין גוש וחלקה להצגה ב-GovMap");
                  return;
                }

                // בונים URL לפי הדוגמה עם פרמטר q של גוש/חלקה לחלקות
                const queryText = `גוש ${gush} חלקה ${helka}`;
                const parcelsUrlWithQuery =
                  `https://www.govmap.gov.il?c=218695%2C628648.75&lay=15&z=12` +
                  `&q=${encodeURIComponent(queryText)}&bb=1&zb=1&in=1`;

                // כשעושים חיפוש, בוחרים רק שכבות
                setSelectedLayers(new Set(['parcels']));
                setEmbedCustomUrl(parcelsUrlWithQuery);
                setSearchError(null);
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              חיפוש
            </button>
          </div>

          {/* חיפוש לפי כתובת ועיר */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  עיר
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && address && city) {
                      // אפשר להוסיף כאן לוגיקה אם צריך
                    }
                  }}
                  placeholder="לדוגמה: תל אביב"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  כתובת
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && address && city) {
                      // אפשר להוסיף כאן לוגיקה אם צריך
                    }
                  }}
                  placeholder="לדוגמה: רחוב הרצל 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!address || !city) {
                    setSearchError("נא להזין כתובת ועיר להצגה ב-GovMap");
                    return;
                  }

                  // בונים URL עם חיפוש לפי כתובת ועיר
                  const queryText = `${address}, ${city}`;
                  const addressUrlWithQuery =
                    `https://www.govmap.gov.il?c=219143.61%2C618345.06&z=15` +
                    `&q=${encodeURIComponent(queryText)}&bb=1&zb=1&in=1`;

                  // משאירים את השכבות הנבחרות
                  setEmbedCustomUrl(addressUrlWithQuery);
                  setSearchError(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                חיפוש כתובת
              </button>
            </div>
          </div>
          
          {searchError && (
            <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {searchError}
            </div>
          )}
        </div>
      </div>

      {/* GovMap embed iframe - תופס את כל העמוד */}
      <div className="flex-1 flex flex-col p-6" dir="rtl">
        <div className="mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => toggleLayer('gushim')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('gushim')
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              גושים
            </button>
            <button
              onClick={() => toggleLayer('parcels')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('parcels')
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              חלקות
            </button>
            <button
              onClick={() => toggleLayer('landUseMavat')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('landUseMavat')
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              יעודי קרקע - מבא"ת
            </button>
            <button
              onClick={() => toggleLayer('urbanRenewal')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('urbanRenewal')
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              התחדשות עירונית
            </button>
            <button
              onClick={() => toggleLayer('preparingPlans')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('preparingPlans')
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תוכניות בהכנה
            </button>
            <button
              onClick={() => toggleLayer('ownershipType')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('ownershipType')
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              סוג בעלות בחלקות רשומות
            </button>
            <button
              onClick={() => toggleLayer('migrazimHousing')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('migrazimHousing')
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מגרשים - משרד הבינוי 
            </button>
            <button
              onClick={() => toggleLayer('marketingPlans')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('marketingPlans')
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תוכניות לשיווק - רמ"י
            </button>
            <button
              onClick={() => toggleLayer('industrialPlots')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('industrialPlots')
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מגרשי תעשייה באזורי פיתוח
            </button>
            <button
              onClick={() => toggleLayer('residentialInventory')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('residentialInventory')
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מלאי תכנוני למגורים
            </button>
            <button
              onClick={() => toggleLayer('realEstateDeals')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('realEstateDeals')
                  ? 'bg-pink-600 text-white border-pink-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              עסקאות נדל"ן
            </button>
            <button
              onClick={() => toggleLayer('tma70Metro')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('tma70Metro')
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תמא 70 - מטרו - גבול תכנית
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-lg overflow-hidden border border-border/40 shadow-sm">
          <iframe
            key={Array.from(selectedLayers).sort().join(',') + (embedCustomUrl || '')} // מכריח רענון מלא כשמחליפים שכבות או URL
            src={embedSrc}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
