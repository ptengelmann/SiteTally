import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { ApiResponse } from '@/types';

interface AssetWithUser {
  asset_id: string;
  asset_name: string;
  qr_code_id: string;
  description: string | null;
  purchase_cost: string | null;
  current_status: string;
  current_location: string | null;
  last_checkout_time: string | null;
  is_active: boolean;
  created_at: string;
  checked_out_by_name: string | null;
  checked_out_by_email: string | null;
}

interface AssetsResponse {
  assets: AssetWithUser[];
  summary: {
    total: number;
    available: number;
    checked_out: number;
    maintenance: number;
    retired: number;
  };
}

// GET - Fetch all assets
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AssetsResponse>>> {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = `
      SELECT
        a.asset_id,
        a.asset_name,
        a.qr_code_id,
        a.description,
        a.purchase_cost,
        a.current_status,
        a.current_location,
        a.last_checkout_time,
        a.is_active,
        a.created_at,
        CASE
          WHEN a.last_checked_out_by_id IS NOT NULL AND a.current_status = 'CHECKED_OUT'
          THEN u.first_name || ' ' || u.last_name
          ELSE NULL
        END as checked_out_by_name,
        CASE
          WHEN a.last_checked_out_by_id IS NOT NULL AND a.current_status = 'CHECKED_OUT'
          THEN u.email
          ELSE NULL
        END as checked_out_by_email
      FROM assets a
      LEFT JOIN users u ON a.last_checked_out_by_id = u.user_id
      WHERE a.is_active = TRUE
    `;

    const params: string[] = [];
    let paramIndex = 1;

    // Filter by status
    if (status && status !== 'ALL') {
      query += ` AND a.current_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Search by name or QR code
    if (search) {
      query += ` AND (a.asset_name ILIKE $${paramIndex} OR a.qr_code_id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.current_status, a.asset_name`;

    const result = await pool.query(query, params);

    // Get summary counts
    const summaryResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE current_status = 'AVAILABLE') as available,
        COUNT(*) FILTER (WHERE current_status = 'CHECKED_OUT') as checked_out,
        COUNT(*) FILTER (WHERE current_status = 'MAINTENANCE') as maintenance,
        COUNT(*) FILTER (WHERE current_status = 'RETIRED') as retired
      FROM assets
      WHERE is_active = TRUE
    `);

    const summary = summaryResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        assets: result.rows,
        summary: {
          total: parseInt(summary.total),
          available: parseInt(summary.available),
          checked_out: parseInt(summary.checked_out),
          maintenance: parseInt(summary.maintenance),
          retired: parseInt(summary.retired),
        },
      },
    });
  } catch (error) {
    console.error('Assets fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// POST - Create new asset (managers only)
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Check if user is a manager
  if (session.user.role !== 'manager') {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Manager access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { asset_name, qr_code_id, description, purchase_cost, current_location } = body;

    // Validate required fields
    if (!asset_name || !qr_code_id) {
      return NextResponse.json(
        { success: false, error: 'Asset name and QR code ID are required' },
        { status: 400 }
      );
    }

    // Check if QR code already exists
    const existingAsset = await pool.query(
      'SELECT asset_id FROM assets WHERE qr_code_id = $1',
      [qr_code_id]
    );

    if (existingAsset.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'QR code ID already exists' },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `INSERT INTO assets (asset_name, qr_code_id, description, purchase_cost, current_location, current_status)
       VALUES ($1, $2, $3, $4, $5, 'AVAILABLE')
       RETURNING *`,
      [asset_name, qr_code_id, description || null, purchase_cost || null, current_location || null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Asset creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}
