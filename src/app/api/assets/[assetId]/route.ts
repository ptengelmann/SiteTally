import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Fetch single asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
): Promise<NextResponse<ApiResponse>> {
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

    const result = await pool.query(
      `SELECT * FROM assets WHERE asset_id = $1 AND is_active = TRUE`,
      [assetId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Asset fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

// PUT - Update asset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
): Promise<NextResponse<ApiResponse>> {
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
    const body = await request.json();
    const { asset_name, description, purchase_cost, current_location, current_status } = body;

    // Validate required fields
    if (!asset_name) {
      return NextResponse.json(
        { success: false, error: 'Asset name is required' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['AVAILABLE', 'CHECKED_OUT', 'MAINTENANCE', 'RETIRED'];
    if (current_status && !validStatuses.includes(current_status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE assets
       SET asset_name = $1,
           description = $2,
           purchase_cost = $3,
           current_location = $4,
           current_status = COALESCE($5, current_status)
       WHERE asset_id = $6 AND is_active = TRUE
       RETURNING *`,
      [asset_name, description || null, purchase_cost || null, current_location || null, current_status || null, assetId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Asset update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
): Promise<NextResponse<ApiResponse>> {
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

    const result = await pool.query(
      `UPDATE assets SET is_active = FALSE WHERE asset_id = $1 RETURNING asset_id`,
      [assetId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Asset deleted successfully' },
    });
  } catch (error) {
    console.error('Asset delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
