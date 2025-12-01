import { useState } from "react";

export default function GovMapPage() {
  // Search state
  const [gush, setGush] = useState<string>("");
  const [helka, setHelka] = useState<string>("");
  const [searchError, setSearchError] = useState<string | null>(null);

  // בחירה בין תצוגת גושים, חלקות, יעודי קרקע - מבא"ת והתחדשות עירונית ב־iframe המוטמע
  const [embedLayer, setEmbedLayer] = useState<'gushim' | 'parcels' | 'landUseMavat' | 'urbanRenewal'>('gushim');
  // URL מותאם אישית (למשל לפי גוש/חלקה) עבור ה־iframe
  const [embedCustomUrl, setEmbedCustomUrl] = useState<string | null>(null);

  const defaultGushimUrl =
    'https://www.govmap.gov.il?c=219143.61%2C618345.06&lay=21&bb=1&zb=1&in=1';
  const defaultParcelsUrl =
    'https://www.govmap.gov.il?c=219143.61%2C618345.06&lay=15&bb=1&zb=1&in=1';
  const defaultLandUseMavatUrl =
    'https://www.govmap.gov.il?c=180310.43%2C637030.67&lay=14&bb=1&zb=1&in=1';
  const defaultUrbanRenewalUrl =
    'https://www.govmap.gov.il?c=202726.24%2C629786.47&lay=200720&bb=1&zb=1&in=1';

  const embedSrc =
    embedLayer === 'gushim'
      ? defaultGushimUrl
      : embedLayer === 'parcels'
      ? embedCustomUrl || defaultParcelsUrl
      : embedLayer === 'landUseMavat'
      ? embedCustomUrl || defaultLandUseMavatUrl
      : embedCustomUrl || defaultUrbanRenewalUrl;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-6 border-b border-border/20">
        <h1 className="text-3xl font-bold text-primary mb-2">מפת GovMap</h1>
        <p className="text-muted-foreground mb-4">
          מפה מבוססת GovMap מוטמעת (iframe)
        </p>
        
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

                setEmbedLayer('parcels');
                setEmbedCustomUrl(parcelsUrlWithQuery);
                setSearchError(null);
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              הצג חלקה ב־GovMap
            </button>
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
          <h2 className="text-lg font-semibold mb-2">
            תצוגת GovMap מוטמעת (iframe)
          </h2>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setEmbedLayer('gushim');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'gushim'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              גושים (lay=21)
            </button>
            <button
              onClick={() => {
                setEmbedLayer('parcels');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'parcels'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              חלקות (lay=15)
            </button>
            <button
              onClick={() => {
                setEmbedLayer('landUseMavat');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'landUseMavat'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              יעודי קרקע - מבא"ת (lay=14)
            </button>
            <button
              onClick={() => {
                setEmbedLayer('urbanRenewal');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'urbanRenewal'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              התחדשות עירונית (lay=200720)
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-lg overflow-hidden border border-border/40 shadow-sm">
          <iframe
            key={embedLayer + (embedCustomUrl || '')} // מכריח רענון מלא כשמחליפים שכבה או URL
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
