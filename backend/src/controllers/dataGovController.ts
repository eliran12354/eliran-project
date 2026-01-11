import { Request, Response } from 'express';
import { getConstructionProgressProjects, getDistinctCities, executeSqlQuery, fetchUrbanRenewalMitchamim } from '../services/dataGovService.js';

/**
 * Get construction progress projects
 * POST /api/datagov/construction-projects
 * Body: { city?: string, gush?: string, helka?: string }
 */
export async function getConstructionProjectsController(req: Request, res: Response) {
  try {
    const { city, gush, helka } = req.body;
    
    console.log('🏗️ Construction projects request:', { city, gush, helka });
    
    const projects = await getConstructionProgressProjects(city, gush, helka);
    
    res.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error: any) {
    console.error('Error getting construction projects:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch construction projects',
      message: error.message || 'Unknown error',
    });
  }
}

/**
 * Get urban renewal mitchamim from data.gov.il
 * POST /api/datagov/urban-renewal-mitchamim
 * Body: { limit?: number, offset?: number, filters?: {...}, search?: string, sortBy?: string, sortOrder?: 'asc'|'desc' }
 */
export async function getUrbanRenewalMitchamimController(req: Request, res: Response) {
  try {
    const { limit, offset, filters, search, sortBy, sortOrder } = req.body;
    
    console.log('🏗️ Urban renewal mitchamim request:', { limit, offset, filters, search, sortBy, sortOrder });
    
    const result = await fetchUrbanRenewalMitchamim({
      limit,
      offset,
      filters,
      search,
      sortBy,
      sortOrder,
    });
    
    res.json({
      success: true,
      data: result.data,
      total: result.total,
    });
  } catch (error: any) {
    console.error('Error getting urban renewal mitchamim:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch urban renewal mitchamim',
      message: error.message || 'Unknown error',
    });
  }
}

/**
 * Execute raw SQL query (debug endpoint)
 * POST /api/datagov/sql
 * Body: { sql: "SELECT ..." }
 */
export async function executeSqlController(req: Request, res: Response) {
  try {
    const { sql } = req.body;
    
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing parameter',
        message: 'sql body parameter is required',
      });
    }
    
    const result = await executeSqlQuery(sql);
    
    res.json({
      success: !result.error,
      result,
    });
  } catch (error: any) {
    console.error('Error executing SQL:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to execute SQL query',
      message: error.message || 'Unknown error',
    });
  }
}

/**
 * Get distinct city names (debug endpoint)
 * GET /api/datagov/distinct-cities?needle=תל
 */
export async function getDistinctCitiesController(req: Request, res: Response) {
  try {
    const { needle } = req.query;
    
    if (!needle || typeof needle !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing parameter',
        message: 'needle query parameter is required',
      });
    }
    
    const cities = await getDistinctCities(needle);
    
    res.json({
      success: true,
      count: cities.length,
      cities,
    });
  } catch (error: any) {
    console.error('Error getting distinct cities:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch distinct cities',
      message: error.message || 'Unknown error',
    });
  }
}

