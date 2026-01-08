/**
 * AI Report Analysis Service
 * Uses OpenAI API directly to analyze land check reports with professional insights
 */

import OpenAI from 'openai';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

console.log('🔑 OpenAI API Key check:', API_KEY ? `✅ Found (length: ${API_KEY.length})` : '❌ NOT FOUND');

if (!API_KEY) {
  console.warn('⚠️ VITE_OPENAI_API_KEY is not set. AI analysis will not work.');
  console.warn('⚠️ Please add VITE_OPENAI_API_KEY to your .env file in the project root');
}

const openai = API_KEY ? new OpenAI({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, consider using a backend proxy
}) : null;

if (openai) {
  console.log('✅ OpenAI client initialized successfully');
} else {
  console.error('❌ Failed to initialize OpenAI client - API key missing');
}

/**
 * System prompt for professional real estate analysis
 */
const SYSTEM_PROMPT = `אתה מומחה לנדל"ן ומנתח דוחות מקצועי בישראל. תפקידך לנתח נתונים של נכס נדל"ן ולהפיק דוח מקצועי, מעמיק ומפורט.

הנתונים כוללים:
- סטטוס תכנוני (חקלאית/בהפשרה/תוכנית בתוקף)
- רמת הכללה בתוכנית (מלאה/חלקית)
- ייעודי קרקע וזכויות עתידיות
- עסקאות נדל"ן בקרבת מקום עם מחירים
- **נתוני מגמות מחירים** (אם זמינים) - חשובים מאוד לניתוח:
  * תשואת שכירות חציונית שנתית - אחוז התשואה השנתית משכירות (ככל שהאחוז גבוה יותר, זה טוב יותר להשקעה)
  * עליית מחירים בשנה האחרונה - אחוז העלייה במחירים (חיובי = מחירים עלו, שלילי = ירדו)
  * ציון יוקר של השכונה - ציון מ-1 עד 10 (10 = שכונת יוקרה, 1 = שכונה פחות יוקרתית)
  * מחירים ממוצעים לפי מספר חדרים - מאפשר להבין את השווי לפי סוג דירה
  * מחירים חציוניים לפי אזור (שכונה/עיר/ארצי) - מאפשר השוואה למיקום רחב יותר
- **פרויקטי התקדמות בנייה** (משרד הבינוי והשיכון) - חשוב מאוד לניתוח:
  * פרויקטים פעילים = האזור מתפתח (יתרון)
  * פרויקטים שהושלמו = האזור התפתח (יתרון)
  * פרויקטים תקועים/מושהים = יכול להעיד על בעיות (סיכון)
  * מספר פרויקטים גבוה = אזור בפיתוח פעיל = פוטנציאל השבחה
- תוכניות בהכנה
- **תוכניות בנייה עיר (משרד המשפטים/הקרקעות)** - מידע קריטי! תוכניות הקשורות ישירות לנכס לפי גוש וחלקה, כולל סטטוס, מהות, תאריכים ומסמכים זמינים
- פרויקטי התחדשות עירונית
- מבנים מסוכנים בסביבה
- קואורדינטות וזיהוי הנכס (גוש/חלקה או כתובת)

עליך לנתח את הנתונים ולספק:

1. **סיכונים** - מה יכול להשפיע לרעה על הנכס:
   - סיכונים תכנוניים
   - **תוכניות בנייה עיר עם הגבלות** - אם יש תוכניות שמגבילות שימוש או בנייה, זה סיכון
   - סיכונים סביבתיים (מבנים מסוכנים, זיהום וכו')
   - סיכונים כלכליים (מחירים, ביקוש וכו')
   - כל סיכון רלוונטי אחר

2. **יתרונות** - מה היתרונות של הנכס והסביבה:
   - יתרונות תכנוניים (תוכניות, התחדשות עירונית וכו')
   - **תוכניות בנייה עיר בתוקף** - אם יש תוכניות בתוקף הקשורות לנכס, זה יתרון חשוב (משפיע על זכויות בנייה)
   - יתרונות מיקומיים
   - יתרונות כלכליים (ערך, פוטנציאל השבחה וכו')
   - כל יתרון רלוונטי אחר

3. **המלצות** - המלצות מקצועיות לפעולה:
   - האם זה נכס טוב לרכישה/השקעה? (תבסס על נתוני המגמות, תשואת שכירות, עליית מחירים, וציון היוקר)
   - מה צריך לבדוק לפני רכישה?
   - אילו פעולות מומלצות?
   - הערכת זמן לפיתוח/שימוש
   - **התייחס ספציפית לנתוני המגמות** - אם יש תשואת שכירות גבוהה או עליית מחירים משמעותית, זה יתרון. אם ציון היוקר גבוה, זה מעיד על אזור מבוקש.

4. **הערכת פוטנציאל** - הערכת הפוטנציאל של הנכס:
   - הערכת שווי נוכחי (אם יש מספיק נתונים)
   - פוטנציאל השבחה
   - תשואה צפויה (אם רלוונטי)
   - סיכויי פיתוח עתידי

הדוח חייב להיות:
- **מקצועי וברור** - כתוב בשפה מקצועית אך נגישה
- **בעברית** - כל הטקסט בעברית
- **מבוסס על הנתונים בלבד** - אל תמציא נתונים שלא קיימים
- **עם ניתוח מעמיק** - לא רק רשימה, אלא ניתוח מעמיק של המשמעויות
- **רלוונטי** - התמקד בנקודות החשובות ביותר
- **מאוזן** - הצג גם סיכונים וגם יתרונות בצורה אובייקטיבית

פורמט התשובה:
החזר JSON עם המבנה הבא:
{
  "analysis": {
    "risks": ["סיכון 1", "סיכון 2", ...],
    "advantages": ["יתרון 1", "יתרון 2", ...],
    "recommendations": ["המלצה 1", "המלצה 2", ...],
    "potential_assessment": "טקסט מפורט על הפוטנציאל"
  },
  "summary": "סיכום קצר (2-3 משפטים)",
  "key_insights": ["תובנה מרכזית 1", "תובנה מרכזית 2", ...]
}`;

export interface AIAnalysisResult {
  analysis: {
    risks: string[];
    advantages: string[];
    recommendations: string[];
    potential_assessment: string;
  };
  summary: string;
  key_insights: string[];
}

/**
 * Analyze a land check report using AI
 */
export async function analyzeReportWithAI(
  report: any // LandCheckReport type
): Promise<AIAnalysisResult | null> {
  if (!openai) {
    console.warn('⚠️ OpenAI client not initialized. Skipping AI analysis.');
    return null;
  }

  try {
    console.log('🤖 Starting AI analysis of land check report...');

    // Prepare the report data as a structured prompt
    const reportPrompt = formatReportForAI(report);

    // Create user prompt with the data
    const userPrompt = `הנה הנתונים לניתוח:\n\n${reportPrompt}\n\n---\n\nאנא נתח את הנתונים והחזר דוח מקצועי לפי הפורמט שביקשתי (JSON עם המבנה המבוקש).`;

    console.log('📤 Sending request to OpenAI API...');
    console.log('📝 User prompt length:', userPrompt.length, 'characters');
    console.log('📝 System prompt length:', SYSTEM_PROMPT.length, 'characters');
    
    // Use OpenAI Chat Completion API directly
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheaper and faster than gpt-4o
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7, // Balance between creativity and consistency
      response_format: { type: 'json_object' }, // Request JSON response
    });

    console.log('✅ OpenAI API call completed');
    
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      console.error('❌ No content received from OpenAI');
      return null;
    }
    
    console.log('📥 Response received:', {
      length: responseContent.length,
      preview: responseContent.substring(0, 200),
    });

    // Parse the JSON response
    let analysisResult: AIAnalysisResult;
    
    try {
      // Parse the JSON response
      analysisResult = JSON.parse(responseContent);
      
      // Validate the structure
      if (!analysisResult.analysis || !analysisResult.summary || !analysisResult.key_insights) {
        console.warn('⚠️ Response structure incomplete, using fallback');
        analysisResult = {
          analysis: {
            risks: analysisResult.analysis?.risks || [],
            advantages: analysisResult.analysis?.advantages || [],
            recommendations: analysisResult.analysis?.recommendations || [],
            potential_assessment: analysisResult.analysis?.potential_assessment || 'לא ניתן להעריך',
          },
          summary: analysisResult.summary || 'לא ניתן לסכם',
          key_insights: analysisResult.key_insights || [],
        };
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.error('❌ Response content:', responseContent.substring(0, 500));
      
      // Fallback structure
      analysisResult = {
        analysis: {
          risks: [],
          advantages: [],
          recommendations: [],
          potential_assessment: responseContent,
        },
        summary: responseContent.substring(0, 200) + '...',
        key_insights: [responseContent.substring(0, 100)],
      };
    }

    console.log('✅ AI analysis completed successfully');
    return analysisResult;
  } catch (error: any) {
    console.error('❌ Error in AI analysis:', error);
    
    // Check if it's an authentication error (401/403) which would indicate invalid API key
    if (error?.status === 401 || error?.status === 403) {
      console.error('🔑 Authentication error - API key might be invalid or expired');
      console.error('💡 Please check your VITE_OPENAI_API_KEY in .env file');
      console.error('💡 Status:', error?.status);
    } else if (error?.message) {
      console.error('❌ Error message:', error.message);
    }
    
    return null;
  }
}

/**
 * Format the land check report as a text prompt for AI
 */
function formatReportForAI(report: any): string {
  const lines: string[] = [];

  // Parcel information
  if (report.parcel_info) {
    lines.push('=== זיהוי הנכס ===');
    if (report.parcel_info.gush && report.parcel_info.helka) {
      lines.push(`גוש: ${report.parcel_info.gush}, חלקה: ${report.parcel_info.helka}`);
    }
    if (report.parcel_info.coordinates) {
      lines.push(`קואורדינטות: ${report.parcel_info.coordinates.lat}, ${report.parcel_info.coordinates.lng}`);
    }
    lines.push('');
  }

  // Planning status
  if (report.planning_status) {
    lines.push('=== סטטוס תכנוני ===');
    lines.push(`סטטוס: ${report.planning_status.status}`);
    if (report.planning_status.plan_name) {
      lines.push(`שם תוכנית: ${report.planning_status.plan_name}`);
    }
    if (report.planning_status.approval_date) {
      lines.push(`תאריך אישור: ${report.planning_status.approval_date}`);
    }
    lines.push('');
  }

  // Land use
  if (report.land_use && report.land_use.length > 0) {
    lines.push('=== ייעודי קרקע ===');
    report.land_use.forEach((lu: any, index: number) => {
      lines.push(`${index + 1}. ${lu.mavat_name || 'לא צוין'}`);
      if (lu.area_m2) {
        lines.push(`   שטח: ${lu.area_m2} מ"ר`);
      }
      if (lu.rights) {
        lines.push(`   זכויות: ${lu.rights}`);
      }
    });
    lines.push('');
  }

  // Preparing plans
  if (report.preparing_plans && report.preparing_plans.length > 0) {
    lines.push('=== תוכניות בהכנה ===');
    report.preparing_plans.slice(0, 5).forEach((plan: any, index: number) => {
      lines.push(`${index + 1}. ${plan.plan_name || 'שם לא צוין'}`);
      if (plan.status) {
        lines.push(`   סטטוס: ${plan.status}`);
      }
      if (plan.distance_meters) {
        lines.push(`   מרחק: ${plan.distance_meters} מטרים`);
      }
    });
    lines.push('');
  }

  // Valuation data
  if (report.valuation) {
    lines.push('=== נתוני הערכה על בסיס עסקאות ===');
    lines.push(`מספר עסקאות: ${report.valuation.transaction_count || 0}`);
    if (report.valuation.average_price_per_sqm) {
      lines.push(`מחיר ממוצע למ"ר: ${report.valuation.average_price_per_sqm.toLocaleString()} ₪`);
    }
    if (report.valuation.price_range) {
      lines.push(
        `טווח מחירים למ"ר: ${report.valuation.price_range.min.toLocaleString()} - ${report.valuation.price_range.max.toLocaleString()} ₪`
      );
    }
    if (report.valuation.recent_transactions && report.valuation.recent_transactions.length > 0) {
      lines.push('\nעסקאות אחרונות:');
      report.valuation.recent_transactions.slice(0, 5).forEach((deal: any, index: number) => {
        lines.push(`${index + 1}. תאריך: ${deal.deal_date || 'לא צוין'}`);
        if (deal.price_nis) {
          lines.push(`   מחיר: ${deal.price_nis.toLocaleString()} ₪`);
        }
        if (deal.area_m2) {
          lines.push(`   שטח: ${deal.area_m2} מ"ר`);
        }
        if (deal.property_type) {
          lines.push(`   סוג נכס: ${deal.property_type}`);
        }
      });
    }
    lines.push('');
  }

  // Price Trends Data - נתוני מגמות מחירים (חשוב מאוד לניתוח!)
  if (report.price_trends) {
    lines.push('=== נתוני מגמות מחירים (מניתוח נדל"ן) - נתונים חשובים לניתוח! ===');
    
    if (report.price_trends.rental_yield_percent !== undefined && report.price_trends.rental_yield_percent !== null) {
      lines.push(`תשואת שכירות חציונית שנתית: ${report.price_trends.rental_yield_percent}%`);
      lines.push(`  (הסבר: זה האחוז השנתי של תשואה משכירות - ככל שהאחוז גבוה יותר, הנכס טוב יותר להשקעה)`);
    }
    
    if (report.price_trends.price_increase_percent !== undefined && report.price_trends.price_increase_percent !== null) {
      lines.push(`עליית מחירים בשנה האחרונה: ${report.price_trends.price_increase_percent}%`);
      const increaseValue = report.price_trends.price_increase_percent;
      if (increaseValue > 0) {
        lines.push(`  (הסבר: מחירים עלו ב-${increaseValue}% בשנה האחרונה - זה סימן חיובי לשוק)`);
      } else if (increaseValue < 0) {
        lines.push(`  (הסבר: מחירים ירדו ב-${Math.abs(increaseValue)}% בשנה האחרונה - זה סימן שלילי לשוק)`);
      } else {
        lines.push(`  (הסבר: מחירים נשארו יציבים בשנה האחרונה)`);
      }
    }
    
    if (report.price_trends.prestige_score !== undefined && report.price_trends.prestige_score !== null) {
      const prestigeMax = report.price_trends.prestige_max || 10;
      const prestigeScore = report.price_trends.prestige_score;
      lines.push(`ציון יוקר של השכונה: ${prestigeScore}/${prestigeMax}`);
      if (prestigeScore >= 8) {
        lines.push(`  (הסבר: זהו ציון יוקר גבוה מאוד - שכונת יוקרה מבוקשת)`);
      } else if (prestigeScore >= 6) {
        lines.push(`  (הסבר: זהו ציון יוקר בינוני-גבוה - שכונה טובה)`);
      } else {
        lines.push(`  (הסבר: זהו ציון יוקר נמוך-בינוני - שכונה רגילה)`);
      }
    }
    
    if (report.price_trends.median_prices_by_rooms) {
      lines.push('\nמחירים ממוצעים לפי מספר חדרים (במליוני שקלים):');
      if (report.price_trends.median_prices_by_rooms['3_rooms']) {
        lines.push(`  3 חדרים: ${report.price_trends.median_prices_by_rooms['3_rooms']} מליון ₪`);
      }
      if (report.price_trends.median_prices_by_rooms['4_rooms']) {
        lines.push(`  4 חדרים: ${report.price_trends.median_prices_by_rooms['4_rooms']} מליון ₪`);
      }
      if (report.price_trends.median_prices_by_rooms.weighted_all) {
        lines.push(`  משוקלל (כל הסוגים): ${report.price_trends.median_prices_by_rooms.weighted_all} מליון ₪`);
      }
      lines.push(`  (הסבר: אלה המחירים החציוניים באזור לפי מספר חדרים - חשוב להשוואת שווי נכס)`);
    }
    
    if (report.price_trends.quarter_prices) {
      lines.push('\nמחירים חציוניים לפי אזור (במליוני שקלים):');
      if (report.price_trends.quarter_prices.neighborhood_name && report.price_trends.quarter_prices.neighborhood) {
        lines.push(`  שכונה (${report.price_trends.quarter_prices.neighborhood_name}): ${report.price_trends.quarter_prices.neighborhood} מליון ₪`);
      }
      if (report.price_trends.quarter_prices.city) {
        lines.push(`  עיר: ${report.price_trends.quarter_prices.city} מליון ₪`);
      }
      if (report.price_trends.quarter_prices.national) {
        lines.push(`  ארצי: ${report.price_trends.quarter_prices.national} מליון ₪`);
      }
      lines.push(`  (הסבר: השוואה בין המחירים בשכונה, בעיר ובארץ - מאפשר להבין את המיקום היחסי של הנכס)`);
    }
    
    lines.push('\n⚠️ חשוב: השתמש בנתוני המגמות האלה בניתוח שלך!');
    lines.push('  - תשואת שכירות גבוהה = נכס טוב להשקעה');
    lines.push('  - עליית מחירים חיובית = שוק מתחזק');
    lines.push('  - ציון יוקר גבוה = אזור מבוקש');
    lines.push('');
  }

  // Construction progress projects - פרויקטי התקדמות בנייה
  if (report.construction_progress_projects && report.construction_progress_projects.length > 0) {
    lines.push('=== פרויקטי התקדמות בנייה (משרד הבינוי והשיכון) ===');
    lines.push('זהו מידע חשוב על פרויקטים פעילים, הושלמו או תקועים באזור - משפיע על התפתחות האזור ופוטנציאל השבחה');
    
    const activeProjects = report.construction_progress_projects.filter(p => 
      p.status && !p.status.toLowerCase().includes('הושלם') && !p.status.toLowerCase().includes('סיום')
    );
    const completedProjects = report.construction_progress_projects.filter(p => 
      p.status && (p.status.toLowerCase().includes('הושלם') || p.status.toLowerCase().includes('סיום'))
    );
    const stuckProjects = report.construction_progress_projects.filter(p => 
      p.status && (p.status.toLowerCase().includes('תקוע') || p.status.toLowerCase().includes('עצור') || p.status.toLowerCase().includes('מושה'))
    );
    
    if (activeProjects.length > 0) {
      lines.push(`\nפרויקטים פעילים (${activeProjects.length}):`);
      activeProjects.slice(0, 5).forEach((project: any, index: number) => {
        lines.push(`${index + 1}. ${project.project_name || 'שם לא צוין'}`);
        if (project.status) {
          lines.push(`   סטטוס: ${project.status}`);
        }
        if (project.progress_percent !== undefined && project.progress_percent !== null) {
          lines.push(`   אחוז התקדמות: ${project.progress_percent}%`);
        }
        if (project.units_count) {
          lines.push(`   מספר יחידות: ${project.units_count}`);
        }
        if (project.city) {
          lines.push(`   עיר: ${project.city}`);
        }
        if (project.distance_meters) {
          lines.push(`   מרחק: ${project.distance_meters} מטרים`);
        }
      });
      lines.push('   (הסבר: פרויקטים פעילים = האזור מתפתח, זה יתרון לנכס)');
    }
    
    if (completedProjects.length > 0) {
      lines.push(`\nפרויקטים שהושלמו (${completedProjects.length}):`);
      completedProjects.slice(0, 3).forEach((project: any, index: number) => {
        lines.push(`${index + 1}. ${project.project_name || 'שם לא צוין'}`);
        if (project.units_count) {
          lines.push(`   מספר יחידות: ${project.units_count}`);
        }
        if (project.distance_meters) {
          lines.push(`   מרחק: ${project.distance_meters} מטרים`);
        }
      });
      lines.push('   (הסבר: פרויקטים שהושלמו = האזור התפתח, זה יתרון לנכס)');
    }
    
    if (stuckProjects.length > 0) {
      lines.push(`\nפרויקטים תקועים/מושהים (${stuckProjects.length}):`);
      stuckProjects.slice(0, 3).forEach((project: any, index: number) => {
        lines.push(`${index + 1}. ${project.project_name || 'שם לא צוין'}`);
        if (project.status) {
          lines.push(`   סטטוס: ${project.status}`);
        }
        if (project.distance_meters) {
          lines.push(`   מרחק: ${project.distance_meters} מטרים`);
        }
      });
      lines.push('   (הסבר: פרויקטים תקועים = יכול להעיד על בעיות, זה סיכון פוטנציאלי)');
    }
    
    lines.push('\n⚠️ חשוב: השתמש במידע הזה בניתוח שלך!');
    lines.push('  - פרויקטים פעילים/הושלמו = יתרון (האזור מתפתח)');
    lines.push('  - פרויקטים תקועים = סיכון (יכול להעיד על בעיות)');
    lines.push('  - מספר פרויקטים גבוה = אזור בפיתוח פעיל = פוטנציאל השבחה');
    lines.push('');
  }

  // Urban renewal projects
  if (report.urban_renewal_projects && report.urban_renewal_projects.length > 0) {
    lines.push('=== פרויקטי התחדשות עירונית ===');
    report.urban_renewal_projects.slice(0, 5).forEach((project: any, index: number) => {
      lines.push(`${index + 1}. ${project.project_name || 'שם לא צוין'}`);
      if (project.project_type) {
        lines.push(`   סוג: ${project.project_type}`);
      }
      if (project.distance_meters) {
        lines.push(`   מרחק: ${project.distance_meters} מטרים`);
      }
    });
    lines.push('');
  }

  // Dangerous buildings
  if (report.nearby_dangerous_buildings && report.nearby_dangerous_buildings.length > 0) {
    lines.push('=== מבנים מסוכנים בסביבה ===');
    lines.push(`נמצאו ${report.nearby_dangerous_buildings.length} מבנים מסוכנים בקרבת מקום`);
    report.nearby_dangerous_buildings.slice(0, 3).forEach((building: any, index: number) => {
      if (building.address) {
        lines.push(`${index + 1}. ${building.address}`);
      }
      if (building.treatment_status) {
        lines.push(`   סטטוס טיפול: ${building.treatment_status}`);
      }
    });
    lines.push('');
  }

  // Taba Plans - תוכניות בנייה עיר (משרד המשפטים/הקרקעות)
  if (report.taba_plans && report.taba_plans.length > 0) {
    lines.push('=== תוכניות בנייה עיר (משרד המשפטים/הקרקעות) - מידע חשוב מאוד! ===');
    lines.push('זהו מידע קריטי על תוכניות בנייה עיר הקשורות ישירות לנכס (לפי גוש וחלקה)');
    lines.push(`נמצאו ${report.taba_plans.length} תוכניות הקשורות לנכס`);
    lines.push('');
    
    const activePlans = report.taba_plans.filter((p: any) => 
      p.status && (p.status.includes('תוקף') || p.status.includes('אושר') || p.status.includes('פרסום'))
    );
    const oldPlans = report.taba_plans.filter((p: any) => 
      p.status && !p.status.includes('תוקף') && !p.status.includes('אושר')
    );
    
    if (activePlans.length > 0) {
      lines.push(`\nתוכניות בתוקף/מאושרות (${activePlans.length}):`);
      activePlans.slice(0, 10).forEach((plan: any, index: number) => {
        lines.push(`${index + 1}. תוכנית ${plan.planNumber || 'לא צוין'}`);
        if (plan.mahut) {
          lines.push(`   מהות: ${plan.mahut}`);
        }
        if (plan.status) {
          lines.push(`   סטטוס: ${plan.status}`);
        }
        if (plan.statusDate) {
          lines.push(`   תאריך סטטוס: ${plan.statusDate}`);
        }
        if (plan.cityText && plan.cityText !== 'לא ידוע') {
          lines.push(`   עיר: ${plan.cityText}`);
        }
        if (plan.documentsSet?.takanon) {
          lines.push(`   תקנון זמין: כן`);
        }
        if (plan.documentsSet?.tasritim && plan.documentsSet.tasritim.length > 0) {
          lines.push(`   תשריטים זמינים: ${plan.documentsSet.tasritim.length}`);
        }
        if (plan.documentsSet?.mmg) {
          lines.push(`   ממג זמין: כן`);
        }
      });
      lines.push('   (הסבר: תוכניות בתוקף = משפיעות ישירות על הנכס, זה קריטי לניתוח!)');
    }
    
    if (oldPlans.length > 0) {
      lines.push(`\nתוכניות ישנות/היסטוריות (${oldPlans.length}):`);
      oldPlans.slice(0, 5).forEach((plan: any, index: number) => {
        lines.push(`${index + 1}. תוכנית ${plan.planNumber || 'לא צוין'}`);
        if (plan.mahut) {
          lines.push(`   מהות: ${plan.mahut}`);
        }
        if (plan.status) {
          lines.push(`   סטטוס: ${plan.status}`);
        }
        if (plan.statusDate) {
          lines.push(`   תאריך: ${plan.statusDate}`);
        }
      });
      lines.push('   (הסבר: תוכניות ישנות = יכולות להעיד על היסטוריה תכנונית של הנכס)');
    }
    
    lines.push('\n⚠️ חשוב מאוד: השתמש במידע הזה בניתוח שלך!');
    lines.push('  - תוכניות בתוקף = משפיעות ישירות על זכויות הבנייה והשימוש בקרקע');
    lines.push('  - תוכניות מאושרות = יכולות להעיד על פוטנציאל השבחה או הגבלות');
    lines.push('  - מספר תוכניות גבוה = אזור עם היסטוריה תכנונית עשירה');
    lines.push('  - תקנונים ותשריטים זמינים = ניתן לבדוק פרטים נוספים');
    lines.push('  - תוכניות ארציות (תמ"א) = משפיעות על כל הארץ');
    lines.push('  - תוכניות מקומיות = משפיעות על האזור הספציפי');
    lines.push('');
  }

  // Existing risks, advantages, recommendations from the report
  if (report.risks && report.risks.length > 0) {
    lines.push('=== סיכונים שנזוהו ===');
    report.risks.forEach((risk: string) => lines.push(`- ${risk}`));
    lines.push('');
  }

  if (report.advantages && report.advantages.length > 0) {
    lines.push('=== יתרונות שנזוהו ===');
    report.advantages.forEach((adv: string) => lines.push(`- ${adv}`));
    lines.push('');
  }

  if (report.recommendations && report.recommendations.length > 0) {
    lines.push('=== המלצות שנזוהו ===');
    report.recommendations.forEach((rec: string) => lines.push(`- ${rec}`));
    lines.push('');
  }

  return lines.join('\n');
}

