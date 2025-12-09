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
    blueLinesMavat: 203,
    goodStreets: 159206,
    urbanRenewal: 200720,
    preparingPlans: 50,
    ownershipType: 6,
    migrazimHousing: 335,
    marketingPlans: 359,
    industrialPlots: 143,
    residentialInventory: 340,
    realEstateDeals: 16,
    tma70Metro: 201,
    controlledPriceComplexes: 200557,
    controlledPricePlots: 200558,
    ramiSequentialPlots: 11,
    ramiRealEstateTenders: 363,
    ramiPlansInWork: 361,
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
    // ננסה עם מספר פרמטרים lay= נפרדים (פורמט מקורי)
    if (selectedLayerIds.length === 1) {
      return `https://www.govmap.gov.il?c=${defaultCenter}&lay=${selectedLayerIds[0]}&bb=1&zb=1&in=1`;
    }
    
    // עבור מספר שכבות, ננסה פורמט עם פסיקים
    const layersParam = selectedLayerIds.join(',');
    return `https://www.govmap.gov.il?c=${defaultCenter}&lay=${layersParam}&bb=1&zb=1&in=1`;
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
    <div className="h-full w-[calc(100%+3rem)] flex flex-col -mx-6 -mb-6">
      <div className="px-6 py-2 border-b border-border/20">
          <h1 className="text-2xl font-bold text-primary mb-1">מפת GovMap</h1>

          
          {/* Search form - מעל התיבה */}
          <div className="mb-1" dir="rtl">
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
                  כתובת <span className="text-gray-500 text-xs">(אופציונלי)</span>
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && city) {
                      // אפשר להוסיף כאן לוגיקה אם צריך
                    }
                  }}
                  placeholder="לדוגמה: רחוב הרצל 1 (לא חובה)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!city) {
                    setSearchError("נא להזין לפחות שם עיר להצגה ב-GovMap");
                    return;
                  }

                  // בונים URL עם חיפוש - אם יש כתובת, משתמשים בכתובת ועיר, אחרת רק עיר
                  const queryText = address ? `${address}, ${city}` : city;
                  const addressUrlWithQuery =
                    `https://www.govmap.gov.il?c=219143.61%2C618345.06&z=15` +
                    `&q=${encodeURIComponent(queryText)}&bb=1&zb=1&in=1`;

                  // משאירים את השכבות הנבחרות
                  setEmbedCustomUrl(addressUrlWithQuery);
                  setSearchError(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                חיפוש
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
      <div className="flex-1 flex flex-col py-0 px-0" dir="rtl">
        <div className="mb-1 px-6">
          <div className="flex gap-2">
            <button
              onClick={() => toggleLayer('gushim')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('gushim')
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              גושים
            </button>
            <button
              onClick={() => toggleLayer('parcels')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('parcels')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              חלקות
            </button>
            <button
              onClick={() => toggleLayer('landUseMavat')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('landUseMavat')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              יעודי קרקע - מבא"ת
            </button>
            <button
              onClick={() => toggleLayer('blueLinesMavat')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('blueLinesMavat')
                  ? 'bg-blue-200 text-gray-800 border-green-400'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              קווים כחולים - מבא"ת
            </button>
            <button
              onClick={() => toggleLayer('goodStreets')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('goodStreets')
                  ? 'bg-blue-300 text-white border-blue-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              רחובות טובים
            </button>
            <button
              onClick={() => toggleLayer('urbanRenewal')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('urbanRenewal')
                  ? 'bg-amber-800 text-white border-amber-800'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              התחדשות עירונית
            </button>
            <button
              onClick={() => toggleLayer('preparingPlans')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('preparingPlans')
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תוכניות בהכנה
            </button>
            <button
              onClick={() => toggleLayer('ownershipType')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('ownershipType')
                  ? 'bg-yellow-500 text-black border-yellow-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              סוג בעלות בחלקות רשומות
            </button>
            <button
              onClick={() => toggleLayer('migrazimHousing')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('migrazimHousing')
                  ? 'bg-cyan-400 text-white border-cyan-400'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מגרשים - משרד הבינוי 
            </button>
            <button
              onClick={() => toggleLayer('marketingPlans')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('marketingPlans')
                  ? 'bg-green-400 text-white border-green-400'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תוכניות לשיווק - רמ"י
            </button>
            <button
              onClick={() => toggleLayer('industrialPlots')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('industrialPlots')
                  ? 'bg-gray-600 text-white border-gray-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מגרשי תעשייה באזורי פיתוח
            </button>
            <button
              onClick={() => toggleLayer('residentialInventory')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('residentialInventory')
                  ? 'bg-cyan-400 text-white border-cyan-400'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מלאי תכנוני למגורים
            </button>
            <button
              onClick={() => toggleLayer('realEstateDeals')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('realEstateDeals')
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              עסקאות נדל"ן
            </button>
            <button
              onClick={() => toggleLayer('tma70Metro')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('tma70Metro')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תמא 70 - מטרו - גבול תכנית
            </button>
            <button
              onClick={() => toggleLayer('controlledPriceComplexes')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('controlledPriceComplexes')
                  ? 'bg-yellow-300 text-black border-yellow-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מתחמי מחיר מפוקח
            </button>
            <button
              onClick={() => toggleLayer('controlledPricePlots')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('controlledPricePlots')
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מגרשי מחיר מפוקח
            </button>
            <button
              onClick={() => toggleLayer('ramiSequentialPlots')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('ramiSequentialPlots')
                  ? 'bg-purple-300 text-white border-purple-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              רצף מגרשי תבע רמ"י
            </button>
            <button
              onClick={() => toggleLayer('ramiRealEstateTenders')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('ramiRealEstateTenders')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מכרזי מקרקעין-רמ"י
            </button>
            <button
              onClick={() => toggleLayer('ramiPlansInWork')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedLayers.has('ramiPlansInWork')
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תוכניות בעבודה והכנה-רמ"י
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
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
