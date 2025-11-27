import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { ApiResponse } from '@/types';

interface LogEntry {
  log_id: string;
  action_type: string;
  timestamp: string;
  job_site_name: string | null;
  notes: string | null;
  user_name: string;
  user_email: string;
}

interface AssetHistory {
  asset: {
    asset_id: string;
    asset_name: string;
    qr_code_id: string;
    current_status: string;
  };
  logs: LogEntry[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
): Promise<NextResponse<ApiResponse<AssetHistory>>> {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  try {
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // Get asset details
    const assetResult = await pool.query(
      `SELECT asset_id, asset_name, qr_code_id, current_status
       FROM assets
       WHERE asset_id = $1 AND is_active = TRUE`,
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Get all logs for this asset
    const logsResult = await pool.query(
      `SELECT
        l.log_id,
        l.action_type,
        l.timestamp,
        l.job_site_name,
        l.notes,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
       FROM logs l
       JOIN users u ON l.user_id = u.user_id
       WHERE l.asset_id = $1
       ORDER BY l.timestamp DESC`,
      [assetId]
    );

    return NextResponse.json({
      success: true,
      data: {
        asset: assetResult.rows[0],
        logs: logsResult.rows,
      },
    });
  } catch (error) {
    console.error('Asset history fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset history' },
      { status: 500 }
    );
  }
}
