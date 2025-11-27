import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { ApiResponse } from '@/types';

interface ActivityLog {
  log_id: string;
  action_type: string;
  timestamp: string;
  job_site_name: string | null;
  notes: string | null;
  user_name: string;
  user_email: string;
  asset_id: string;
  asset_name: string;
  qr_code_id: string;
}

interface ActivityResponse {
  logs: ActivityLog[];
  total: number;
}

// GET - Fetch all activity logs
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ActivityResponse>>> {
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const actionType = searchParams.get('action');
    const userId = searchParams.get('user');

    let query = `
      SELECT
        l.log_id,
        l.action_type,
        l.timestamp,
        l.job_site_name,
        l.notes,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        a.asset_id,
        a.asset_name,
        a.qr_code_id
      FROM logs l
      JOIN users u ON l.user_id = u.user_id
      JOIN assets a ON l.asset_id = a.asset_id
      WHERE 1=1
    `;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Filter by action type
    if (actionType && (actionType === 'CHECK_OUT' || actionType === 'CHECK_IN')) {
      query += ` AND l.action_type = $${paramIndex}`;
      params.push(actionType);
      paramIndex++;
    }

    // Filter by user
    if (userId) {
      query += ` AND l.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Add ordering and pagination
    query += ` ORDER BY l.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: {
        logs: result.rows,
        total,
      },
    });
  } catch (error) {
    console.error('Activity fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
