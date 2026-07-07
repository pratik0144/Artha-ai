/**
 * api/schemes/all.js — GET /api/schemes/all
 * Returns all government schemes from Supabase
 */

import { getSupabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = getSupabase();
    const { data: schemes, error } = await supabase
      .from('schemes_database').select('*');

    if (error) throw error;

    return res.status(200).json({
      status: 'success',
      count: (schemes || []).length,
      schemes: schemes || [],
    });
  } catch (error) {
    console.error('[schemes/all] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
