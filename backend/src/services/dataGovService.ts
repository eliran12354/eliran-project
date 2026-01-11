/**
 * Service for data.gov.il API integration
 * Proxies requests to avoid CORS issues from frontend
 */

const RESOURCE_ID = '1ec45809-5927-430a-9b30-77f77f528ce3';
const URBAN_RENEWAL_RESOURCE_ID = 'f65a0daf-f737-49c5-9424-d378d52104f5'; // Urban renewal mitchamim
const BASE_URL = 'https://data.gov.il/api/3/action';
const SQL_URL = `${BASE_URL}/datastore_search_sql`; // SQL endpoint
const SEARCH_URL = `${BASE_URL}/datastore_search`; // Regular search endpoint

/**
 * Fetch projects by city using SQL LIKE query
 */
export async function fetchProjectsByCitySql(city: string, limit = 2000): Promise<any[]> {
  try {
    // Escape single quotes for SQL injection prevention
    const escapedCity = city.replace(/'/g, "''");
    const sql = `SELECT * FROM "${RESOURCE_ID}" WHERE "YESHUV_LAMAS" LIKE '%${escapedCity}%' LIMIT ${limit}`;
    const url = `${SQL_URL}?sql=${encodeURIComponent(sql)}`;
    
    console.log(`🔍 Backend SQL search for city: "${city}"`);
    console.log(`📍 SQL URL: ${url.substring(0, 100)}...`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    if (!res.ok) {
      console.warn(`⚠️ SQL search failed: ${res.status}`);
      return [];
    }
    
    const json: any = await res.json();
    const records = json?.result?.records ?? [];
    
    if (records.length > 0) {
      console.log(`✅ SQL search found ${records.length} projects for "${city}"`);
    }
    
    return records;
  } catch (error: any) {
    console.error('❌ SQL search error:', error);
    return [];
  }
}

/**
 * Execute raw SQL query for debugging
 */
export async function executeSqlQuery(sql: string): Promise<any> {
  try {
    const url = `${SQL_URL}?sql=${encodeURIComponent(sql)}`;
    console.log(`🔍 Executing SQL: ${sql.substring(0, 100)}...`);
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ SQL query failed: ${res.status} - ${errorText.substring(0, 200)}`);
      return { error: `HTTP ${res.status}`, details: errorText.substring(0, 200) };
    }
    
    const json = await res.json();
    return json;
  } catch (error: any) {
    console.error('❌ SQL query error:', error);
    return { error: error.message || 'Unknown error' };
  }
}

/**
 * Debug function to find exact city names in dataset
 */
export async function getDistinctCities(needle: string): Promise<string[]> {
  try {
    const escapedNeedle = needle.replace(/'/g, "''");
    const sql = `SELECT DISTINCT "YESHUV_LAMAS" FROM "${RESOURCE_ID}" WHERE "YESHUV_LAMAS" LIKE '%${escapedNeedle}%' LIMIT 200`;
    const url = `${SQL_URL}?sql=${encodeURIComponent(sql)}`;
    
    console.log(`🔎 Debug query URL: ${url.substring(0, 150)}...`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    if (res.ok) {
      const json: any = await res.json();
      const distinctCities = json?.result?.records?.map((r: any) => r.YESHUV_LAMAS) ?? [];
      console.log(`🔎 DISTINCT cities matching "${needle}":`, distinctCities);
      return distinctCities;
    }
    
    return [];
  } catch (error: any) {
    console.error('Debug distinct cities failed:', error);
    return [];
  }
}

/**
 * Fetch all records with pagination
 */
export async function fetchAllProjectsPaged(pageSize = 5000, maxPages = 20): Promise<any[]> {
  let offset = 0;
  let all: any[] = [];
  
  console.log(`📄 Fetching all records with pagination (pageSize: ${pageSize}, maxPages: ${maxPages})...`);
  
  for (let i = 0; i < maxPages; i++) {
    const fullUrl = `${SEARCH_URL}?resource_id=${RESOURCE_ID}&limit=${pageSize}&offset=${offset}`;
    
    try {
      const res = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      
      if (!res.ok) {
        console.warn(`⚠️ Failed to fetch page ${i + 1} at offset ${offset}: ${res.status}`);
        break;
      }
      
      const json: any = await res.json();
      const records = json?.result?.records ?? [];
      
      if (records.length === 0) {
        console.log(`📄 No more records at page ${i + 1}`);
        break;
      }
      
      all = all.concat(records);
      console.log(`📄 Page ${i + 1}: fetched ${records.length} records (total: ${all.length})`);
      
      // If we got fewer records than pageSize, we've reached the end
      if (records.length < pageSize) {
        console.log(`📄 Reached end of data at page ${i + 1}`);
        break;
      }
      
      offset += pageSize;
    } catch (error: any) {
      console.error(`❌ Error fetching page ${i + 1}:`, error);
      break;
    }
  }
  
  console.log(`📄 Total fetched with pagination: ${all.length} records`);
  return all;
}

/**
 * Get construction progress projects
 * Main function that tries SQL first, then pagination if needed
 */
export async function getConstructionProgressProjects(
  city?: string,
  gush?: string,
  helka?: string
): Promise<any[]> {
  let allProjects: any[] = [];
  let foundWithSql = false;
  
  // Try SQL search first if city is provided
  if (city) {
    // Debug: Check if city exists in dataset first
    console.log(`🔍 Checking if city "${city}" exists in dataset...`);
    
    // Count query to check existence - use just "תל" to catch variations
    const citySearchTerm = city.includes('תל') ? 'תל' : city;
    const countSql = `SELECT COUNT(*) AS cnt FROM "${RESOURCE_ID}" WHERE "YESHUV_LAMAS" LIKE '%${citySearchTerm.replace(/'/g, "''")}%'`;
    const countResult = await executeSqlQuery(countSql);
    const count = countResult?.result?.records?.[0]?.cnt || 0;
    console.log(`📊 Found ${count} records matching "${citySearchTerm}"`);
    
    // Debug: Get distinct city names
    const distinctCities = await getDistinctCities(citySearchTerm);
    if (distinctCities.length > 0) {
      console.log(`🔎 Distinct cities found:`, distinctCities);
    }
    
    // Try SQL LIKE search if count > 0
    if (count > 0) {
      const sqlResults = await fetchProjectsByCitySql(city, 2000);
      
      if (sqlResults.length > 0) {
        allProjects = sqlResults;
        foundWithSql = true;
        console.log(`✅ Using SQL search results: ${allProjects.length} projects`);
      }
    } else {
      console.log(`⚠️ No records found for "${city}" - will try pagination`);
    }
  }
  
  // If SQL didn't work or no city, try full pagination
  if (!foundWithSql) {
    if (city) {
      console.log('⚠️ SQL search returned no results, trying full pagination...');
    } else {
      console.log('📄 No city specified, fetching all records with pagination...');
    }
    
    allProjects = await fetchAllProjectsPaged(5000, 20);
  }
  
  // Filter and process projects
  const filteredProjects: any[] = [];
  
  for (const project of allProjects) {
    // Extract project information
    const projectCity = String(
      project['YESHUV_NAME'] ??
      project['SHEM_YESHUV'] ??
      project['YESHUV'] ??
      project['יישוב'] ??
      project['YESHUV_LAMAS'] ??
      ''
    );
    
    // Filter by city if provided (and we got all projects via pagination)
    if (city && !foundWithSql) {
      const cityNorm = city.toLowerCase().replace(/\s|-/g, '');
      const projectCityNorm = projectCity.toLowerCase().replace(/\s|-/g, '');
      
      const cityMatch =
        projectCityNorm.includes(cityNorm) ||
        cityNorm.includes(projectCityNorm);
      
      if (!cityMatch) continue;
    }
    
    // Extract other fields
    const projectName = project['ATAR'] || project['SHEM_MITHAM'] || project['אתר'] || project['שם מתחם'] || 'לא צוין';
    const projectGush = String(project['GUSH'] ?? project['גוש'] ?? '');
    const projectHelka = String(project['HELKA'] ?? project['חלקה'] ?? '');
    const units = project['YEHIDOT_BINYAN'] || project['יח"ד בניין'] || project['יחידות'] || 0;
    const area = project['SHETAH'] || project['שטח'] || '';
    const marketingMethod = project['SHITAT_SHIVUK'] || project['תיאור שיטת שיווק'] || '';
    const fixedDate = project['TAARICH_KOBEA'] || project['התאריך הקובע'] || '';
    
    // Check if matches gush/helka
    let matchesGushHelka = false;
    if (gush && helka && projectGush && projectHelka) {
      if (projectGush === gush.toString() && projectHelka === helka.toString()) {
        matchesGushHelka = true;
      }
    }
    
    filteredProjects.push({
      project_name: projectName,
      project_id: project['_id']?.toString() || project['MISPAR_MITHAM']?.toString() || '',
      city: projectCity,
      street: '',
      status: marketingMethod || 'לא צוין',
      progress_percent: undefined,
      units_count: units ? parseInt(String(units), 10) : undefined,
      coordinates: undefined,
      distance_meters: undefined,
      gush: projectGush,
      helka: projectHelka,
      area_m2: area ? parseFloat(String(area).replace(/[^\d.]/g, '')) : undefined,
      marketing_method: marketingMethod,
      fixed_date: fixedDate,
      matches_parcel: matchesGushHelka,
      ...project, // Include all original fields
    });
  }
  
  // Sort by relevance: projects matching gush/helka first
  filteredProjects.sort((a, b) => {
    if (a.matches_parcel && !b.matches_parcel) return -1;
    if (!a.matches_parcel && b.matches_parcel) return 1;
    return (a.project_name || '').localeCompare(b.project_name || '');
  });
  
  // Limit to top 20
  return filteredProjects.slice(0, 20);
}

/**
 * Fetch urban renewal mitchamim from data.gov.il
 * Uses resource_id: f65a0daf-f737-49c5-9424-d378d52104f5
 */
export async function fetchUrbanRenewalMitchamim(options: {
  limit?: number;
  offset?: number;
  filters?: {
    yeshuv?: string;
    status?: string;
    min_units?: number;
    max_units?: number;
  };
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<{ data: any[]; total: number }> {
  try {
    const { limit = 50, offset = 0, filters = {}, search, sortBy = 'IMPORTED_AT', sortOrder = 'desc' } = options;
    
    // Use regular search endpoint instead of SQL (SQL endpoint returns 403)
    let url = `${SEARCH_URL}?resource_id=${URBAN_RENEWAL_RESOURCE_ID}&limit=${limit}&offset=${offset}`;
    
    // Add q parameter for search
    if (search) {
      url += `&q=${encodeURIComponent(search)}`;
    }
    
    // Add filters using q parameter (data.gov.il uses q for text search)
    const filterParts: string[] = [];
    if (filters.yeshuv) {
      filterParts.push(filters.yeshuv);
    }
    if (filters.status) {
      filterParts.push(filters.status);
    }
    if (filterParts.length > 0 && !search) {
      url += `&q=${encodeURIComponent(filterParts.join(' '))}`;
    }
    
    console.log(`🔍 Fetching urban renewal mitchamim from data.gov.il...`);
    console.log(`📍 URL: ${url.substring(0, 150)}...`);
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.warn(`⚠️ Failed to fetch urban renewal mitchamim: ${res.status} ${res.statusText}`);
      console.warn(`Error details: ${errorText.substring(0, 200)}`);
      
      // Try without filters as fallback
      if (filters.yeshuv || filters.status || search) {
        console.log('🔄 Retrying without filters...');
        const fallbackUrl = `${SEARCH_URL}?resource_id=${URBAN_RENEWAL_RESOURCE_ID}&limit=${limit}&offset=${offset}`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json',
          },
        });
        
        if (fallbackRes.ok) {
          const fallbackJson: any = await fallbackRes.json();
          const records = fallbackJson?.result?.records ?? [];
          
          // Apply client-side filtering
          let filteredRecords = records;
          if (filters.yeshuv) {
            filteredRecords = filteredRecords.filter((r: any) => 
              r.YESHUV && r.YESHUV.includes(filters.yeshuv!)
            );
          }
          if (filters.status) {
            filteredRecords = filteredRecords.filter((r: any) => 
              r.STATUS && r.STATUS.includes(filters.status!)
            );
          }
          if (filters.min_units) {
            filteredRecords = filteredRecords.filter((r: any) => 
              r.MISPAR_YAHIDOT && Number(r.MISPAR_YAHIDOT) >= filters.min_units!
            );
          }
          if (filters.max_units) {
            filteredRecords = filteredRecords.filter((r: any) => 
              r.MISPAR_YAHIDOT && Number(r.MISPAR_YAHIDOT) <= filters.max_units!
            );
          }
          if (search) {
            const searchLower = search.toLowerCase();
            filteredRecords = filteredRecords.filter((r: any) => 
              (r.YESHUV && r.YESHUV.toLowerCase().includes(searchLower)) ||
              (r.STATUS && r.STATUS.toLowerCase().includes(searchLower)) ||
              (r.SHEM_MITCHAM && r.SHEM_MITCHAM.toLowerCase().includes(searchLower))
            );
          }
          
          console.log(`✅ Fetched ${filteredRecords.length} filtered records (from ${records.length} total)`);
          return { data: filteredRecords, total: filteredRecords.length };
        }
      }
      
      return { data: [], total: 0 };
    }
    
    const json: any = await res.json();
    
    if (json.error) {
      console.error('❌ API error:', json.error);
      return { data: [], total: 0 };
    }
    
    const records = json?.result?.records ?? [];
    const total = json?.result?.total || records.length;
    
    // Log first record to see structure
    if (records.length > 0) {
      console.log('📋 Sample record structure:', Object.keys(records[0]));
      console.log('📋 Sample record:', JSON.stringify(records[0]).substring(0, 300));
    }
    
    // Apply client-side filtering for numeric filters
    let filteredRecords = records;
    if (filters.min_units) {
      filteredRecords = filteredRecords.filter((r: any) => {
        const units = r.MISPAR_YAHIDOT || r.mispar_yahidot || r.YACHAD_TOSAFTI || r.yachad_tosafti;
        return units && Number(units) >= filters.min_units!;
      });
    }
    if (filters.max_units) {
      filteredRecords = filteredRecords.filter((r: any) => {
        const units = r.MISPAR_YAHIDOT || r.mispar_yahidot || r.YACHAD_TOSAFTI || r.yachad_tosafti;
        return units && Number(units) <= filters.max_units!;
      });
    }
    
    // Sort client-side if needed
    if (sortBy && sortBy !== 'IMPORTED_AT') {
      filteredRecords.sort((a: any, b: any) => {
        const aVal = a[sortBy] || a[sortBy.toLowerCase()] || '';
        const bVal = b[sortBy] || b[sortBy.toLowerCase()] || '';
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    console.log(`✅ Fetched ${filteredRecords.length} urban renewal mitchamim records (total: ${total})`);
    
    return { data: filteredRecords, total };
  } catch (error: any) {
    console.error('❌ Error fetching urban renewal mitchamim:', error);
    return { data: [], total: 0 };
  }
}

