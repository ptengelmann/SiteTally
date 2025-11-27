import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { CheckoutRequest, ApiResponse, Asset } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Asset>>> {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  const client = await pool.connect();

  try {
    const body: CheckoutRequest = await request.json();
    const { qr_code_id, job_site_name, notes } = body;
    // Use authenticated user's ID instead of body user_id
    const user_id = session.user.id;

    // Validate required fields
    if (!qr_code_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: qr_code_id' },
        { status: 400 }
      );
    }

    // Start transaction
    await client.query('BEGIN');

    // 1. Find the asset by QR code and lock it for update
    const assetResult = await client.query(
      `SELECT * FROM assets WHERE qr_code_id = $1 AND is_active = TRUE FOR UPDATE`,
      [qr_code_id]
    );

    if (assetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Asset not found or inactive' },
        { status: 404 }
      );
    }

    const asset = assetResult.rows[0];

    // 2. Check if asset is available
    if (asset.current_status !== 'AVAILABLE') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: `Asset is not available. Current status: ${asset.current_status}` },
        { status: 409 }
      );
    }

    // 3. Verify the user exists and is active
    const userResult = await client.query(
      `SELECT user_id FROM users WHERE user_id = $1 AND is_active = TRUE`,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    const checkoutTime = new Date();

    // 4. Update the asset status
    const updateResult = await client.query(
      `UPDATE assets
       SET current_status = 'CHECKED_OUT',
           last_checked_out_by_id = $1,
           last_checkout_time = $2,
           current_location = $3
       WHERE asset_id = $4
       RETURNING *`,
      [user_id, checkoutTime, job_site_name || null, asset.asset_id]
    );

    // 5. Create the log entry
    await client.query(
      `INSERT INTO logs (asset_id, user_id, action_type, timestamp, job_site_name, notes)
       VALUES ($1, $2, 'CHECK_OUT', $3, $4, $5)`,
      [asset.asset_id, user_id, checkoutTime, job_site_name || null, notes || null]
    );

    // Commit transaction
    await client.query('COMMIT');

    const updatedAsset: Asset = updateResult.rows[0];

    return NextResponse.json({
      success: true,
      data: updatedAsset
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during checkout' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
