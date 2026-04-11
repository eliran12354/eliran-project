import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/ContactDialog";

const CORE_TOOLS = [
  {
    to: "/plans",
    icon: "analytics",
    title: "ניתוח תכנון ובנייה",
    description: 'ניתוח היתרים, תב"עות וצפי התקדמות פרויקטים',
  },
  {
    to: "/urban-renewal",
    icon: "location_city",
    title: "איתור התחדשות עירונית",
    description: 'זיהוי מתחמים בעלי פוטנציאל פינוי-בינוי ותמ"א',
  },
  {
    to: "/listings",
    icon: "payments",
    title: "מודיעין עסקאות וקרקע",
    description: "מידע היסטורי ועדכני על מחירי רכישה וחוזים",
  },
  {
    to: "/dangerous-buildings",
    icon: "report_problem",
    title: "ניהול סיכוני מבנים",
    description: "ניטור מצב פיזי, סקרים הנדסיים וסיכונים פיננסיים",
  },
] as const;

const coreToolLinkClassName =
  "group flex items-center gap-4 rounded-xl border-2 border-slate-200/90 bg-white p-4 md:p-5 text-right shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:border-primary/50 hover:bg-primary/[0.04] hover:shadow-[0_8px_28px_rgba(17,82,212,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

/** Break out of Layout `main` horizontal padding; document `overflow-x: hidden` avoids 100vw scrollbar overflow. */
const sectionFullBleedStyle = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

const Index = () => {
  return (
    <div className="w-full bg-[#F5F7FA]" dir="rtl">
      {/* Hero Section */}
      <section
        className="relative min-h-screen w-full max-w-none flex flex-col justify-center pt-10 lg:pt-20 bg-white overflow-hidden"
        style={sectionFullBleedStyle}
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-no-repeat w-full h-full"
          style={{
            backgroundImage: 'url("/mathias-reding-dyOrM2JzXhU-unsplash.jpg")',
            backgroundSize: '100% 120%',
            backgroundPosition: 'center top',
            backgroundAttachment: 'fixed',
            imageRendering: 'high-quality',
            WebkitImageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            willChange: 'transform',
            WebkitBackfaceVisibility: 'hidden',
            WebkitPerspective: 1000
          }}
        />
        
        {/* Overlay to ensure text readability - minimal opacity */}
        <div className="absolute inset-0 bg-white/20 pointer-events-none"></div>
        
        {/* Subtle noise texture overlay at 2% opacity */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V4h4V2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V4h4V2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Very soft gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 py-20 lg:py-32">

          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/10 border border-black/20 text-black text-xs sm:text-sm font-bold mb-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)] max-w-[min(100%,28rem)]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
              </span>
              <span className="text-right leading-snug">מבוסס על נתונים ממשלתיים ומתעדכן בזמן אמת</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] text-[#111318] mb-8 font-display">
              המערכת שמקדימה את <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-[#111318]">שוק הנדל״ן</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-black max-w-2xl leading-relaxed mb-12 bg-white/20 backdrop-blur-md border border-white/30 px-6 py-4 rounded-xl shadow-lg">
              מערכת לאיתור הזדמנויות נדל״ן וניתוח נכסים, הכוללת דוחות AI, נתונים תכנוניים ממקורות ממשלתיים וכלים מתקדמים – לקבלת החלטות חכמות ובטוחות.
            </p>
            
            <div className="flex flex-col gap-2 w-fit max-w-full">
              <Link to="/business" className="inline-flex">
                <Button 
                  variant="outline" 
                  className="h-16 px-10 border-2 border-primary text-primary text-lg font-bold rounded-xl flex items-center justify-center hover:bg-primary/5 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  כניסה למערכת
                </Button>
              </Link>
              <p className="text-xs sm:text-sm text-black text-right">
                גישה מיידית ללא התחייבות
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent"></div>

      {/* Value Proposition */}
      <section
        className="py-28 lg:py-36 bg-white relative overflow-hidden"
        style={sectionFullBleedStyle}
      >
        {/* Subtle texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V4h4V2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V4h4V2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[16px] bg-white border border-slate-200/60 hover:border-primary/30 transition-all group shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform shadow-[0_2px_8px_rgba(17,82,212,0.1)]">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#111318]">בלעדיות במידע</h3>
              <p className="text-slate-600 leading-relaxed">
                גישה למאגרי מידע ייחודיים ומקורות גלויים ונסתרים שאינם זמינים לציבור הרחב בממשק אחד.
              </p>
            </div>
            
            <div className="p-8 rounded-[16px] bg-white border border-slate-200/60 hover:border-primary/30 transition-all group shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform shadow-[0_2px_8px_rgba(17,82,212,0.1)]">
                <span className="material-symbols-outlined text-3xl">hub</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#111318]">חיבור נתונים חכם</h3>
              <p className="text-slate-600 leading-relaxed">
                אלגוריתמיקה מתקדמת המצליבה בין שכבות מידע תכנוני, כלכלי ומשפטי לכדי תמונה אחת ברורה.
              </p>
            </div>
            
            <div className="p-8 rounded-[16px] bg-white border border-slate-200/60 hover:border-primary/30 transition-all group shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform shadow-[0_2px_8px_rgba(17,82,212,0.1)]">
                <span className="material-symbols-outlined text-3xl">trending_up</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#111318]">יתרון תחרותי</h3>
              <p className="text-slate-600 leading-relaxed">
                היו הראשונים לזהות הזדמנויות בשוק, שינויי ייעוד ועסקאות חריגות לפני כל המתחרים שלכם.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent"></div>

      {/* Core Tools Section */}
      <section
        className="relative py-28 bg-[#F5F7FA] overflow-hidden"
        style={sectionFullBleedStyle}
      >
        {/* Subtle texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(17, 82, 212, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(17, 82, 212, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-4 text-[#111318] font-display">כלי הנדל״ן המרכזיים</h2>
              <p className="text-slate-600 text-lg max-w-xl">
                הכלים המקצועיים שמעניקים לכם שליטה מלאה בנתוני השוק בזמן אמת.
              </p>
            </div>
            <Button 
              variant="outline"
              className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all border-primary shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              צפייה בכל היכולות
              <span className="material-symbols-outlined">arrow_back</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CORE_TOOLS.map(({ to, icon, title, description }) => (
              <Link key={to} to={to} className={coreToolLinkClassName}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[#111318] group-hover:text-primary transition-colors">{title}</h4>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{description}</p>
                </div>
                <span className="material-symbols-outlined text-slate-400 shrink-0 transition-colors group-hover:text-primary">
                  chevron_left
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Subtle Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent"></div>

      {/* Final Call to Action - Dark Premium Section */}
      <section
        className="py-28 lg:py-44 bg-gradient-to-br from-[#0a1a3a] via-[#0d2447] to-[#0a1a3a] relative overflow-hidden"
        style={sectionFullBleedStyle}
      >
        {/* Subtle texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V4h4V2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V4h4V2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight text-white font-display">
            הצטרפו למובילי השוק <br/> המשתמשים במערכת הנדל״ן
          </h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            קבלו גישה לנתוני האמת ולמערכות הניתוח המתקדמות ביותר בישראל כבר היום.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link to="/business">
              <Button className="h-16 px-12 bg-primary text-white text-xl font-black rounded-xl hover:shadow-[0_0_30px_rgba(17,82,212,0.4)] transition-all hover:scale-[1.02] shadow-[0_8px_24px_rgba(17,82,212,0.3)]">
                פתיחת חשבון עסקי
              </Button>
            </Link>
            <ContactDialog>
              <Button 
                type="button"
                variant="outline"
                className="h-16 px-12 border-2 border-white/20 text-white text-xl font-bold rounded-xl hover:bg-white/10 hover:border-white/30 transition-all bg-white/5 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
              >
                צור קשר
              </Button>
            </ContactDialog>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
