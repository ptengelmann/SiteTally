import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResponse, Asset } from '@/types';

interface AssetWithUser extends Asset {
  checked_out_by_name?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCodeId: string }> }
): Promise<NextResponse<ApiResponse<AssetWithUser>>> {
  try {
    const { qrCodeId } = await params;

    if (!qrCodeId) {
      return NextResponse.json(
        { success: false, error: 'QR code ID is required' },
        { status: 400 }
      );
    }

    // Get asset with optional user info if checked out
    const result = await pool.query(
      `SELECT
        a.*,
        CASE
          WHEN a.last_checked_out_by_id IS NOT NULL
          THEN u.first_name || ' ' || u.last_name
          ELSE NULL
        END as checked_out_by_name
       FROM assets a
       LEFT JOIN users u ON a.last_checked_out_by_id = u.user_id
       WHERE a.qr_code_id = $1 AND a.is_active = TRUE`,
      [qrCodeId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    const asset: AssetWithUser = result.rows[0];

    return NextResponse.json({
      success: true,
      data: asset
    });

  } catch (error) {
    console.error('Asset lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
