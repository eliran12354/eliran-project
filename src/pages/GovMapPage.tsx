import { useState } from "react";

export default function GovMapPage() {
  // Search state
  const [gush, setGush] = useState<string>("");
  const [helka, setHelka] = useState<string>("");
  const [searchError, setSearchError] = useState<string | null>(null);

  // בחירה בין תצוגת גושים, חלקות, יעודי קרקע - מבא"ת, התחדשות עירונית, תוכניות בהכנה,
  // סוג בעלות בחלקות רשומות, מגרשים - משרד הבינוי, תוכניות לשיווק - רמ"י, מגרשי תעשייה באזורי פיתוח
  // ומלאי תכנוני למגורים ב־iframe המוטמעת
  const [embedLayer, setEmbedLayer] = useState<
    | 'gushim'
    | 'parcels'
    | 'landUseMavat'
    | 'urbanRenewal'
    | 'preparingPlans'
    | 'ownershipType'
    | 'migrazimHousing'
    | 'marketingPlans'
    | 'industrialPlots'
    | 'residentialInventory'
  >('gushim');
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
  const defaultPreparingPlansUrl =
    'https://www.govmap.gov.il?c=219143.61%2C618345.06&lay=50&bb=1&zb=1&in=1';
  const defaultOwnershipTypeUrl =
    'https://www.govmap.gov.il?c=219143.61%2C618345.06&lay=6&bb=1&zb=1&in=1';
  const defaultMigrazimHousingUrl =
    'https://www.govmap.gov.il?c=219143.61%2C618345.06&lay=335&bb=1&zb=1&in=1';
  const defaultMarketingPlansUrl =
    'https://www.govmap.gov.il?c=219143.61%2C618345.06&lay=359&bb=1&zb=1&in=1';
  const defaultIndustrialPlotsUrl =
    'https://www.govmap.gov.il?c=219143.61%2C618345.06&lay=143&bb=1&zb=1&in=1';
  const defaultResidentialInventoryUrl =
    'https://www.govmap.gov.il?c=219143.61%2C618345.06&lay=340&bb=1&zb=1&in=1';

  const embedSrc =
    embedLayer === 'gushim'
      ? defaultGushimUrl
      : embedLayer === 'parcels'
      ? embedCustomUrl || defaultParcelsUrl
      : embedLayer === 'landUseMavat'
      ? embedCustomUrl || defaultLandUseMavatUrl
      : embedLayer === 'urbanRenewal'
      ? embedCustomUrl || defaultUrbanRenewalUrl
      : embedLayer === 'preparingPlans'
      ? embedCustomUrl || defaultPreparingPlansUrl
      : embedLayer === 'ownershipType'
      ? embedCustomUrl || defaultOwnershipTypeUrl
      : embedLayer === 'migrazimHousing'
      ? embedCustomUrl || defaultMigrazimHousingUrl
      : embedLayer === 'marketingPlans'
      ? embedCustomUrl || defaultMarketingPlansUrl
      : embedLayer === 'industrialPlots'
      ? embedCustomUrl || defaultIndustrialPlotsUrl
      : embedCustomUrl || defaultResidentialInventoryUrl;

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

                setEmbedLayer('parcels');
                setEmbedCustomUrl(parcelsUrlWithQuery);
                setSearchError(null);
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              חיפוש
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
              גושים
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
              חלקות
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
              יעודי קרקע - מבא"ת
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
              התחדשות עירונית
            </button>
            <button
              onClick={() => {
                setEmbedLayer('preparingPlans');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'preparingPlans'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תוכניות בהכנה
            </button>
            <button
              onClick={() => {
                setEmbedLayer('ownershipType');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'ownershipType'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              סוג בעלות בחלקות רשומות
            </button>
            <button
              onClick={() => {
                setEmbedLayer('migrazimHousing');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'migrazimHousing'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מגרשים - משרד הבינוי 
            </button>
            <button
              onClick={() => {
                setEmbedLayer('marketingPlans');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'marketingPlans'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              תוכניות לשיווק - רמ"י
            </button>
            <button
              onClick={() => {
                setEmbedLayer('industrialPlots');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'industrialPlots'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מגרשי תעשייה באזורי פיתוח
            </button>
            <button
              onClick={() => {
                setEmbedLayer('residentialInventory');
                setEmbedCustomUrl(null); // איפוס ל-URL ברירת מחדל
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                embedLayer === 'residentialInventory'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              מלאי תכנוני למגורים
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
