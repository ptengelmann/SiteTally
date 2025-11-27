import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only managers can export
    if (session.user.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only managers can export data' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'assets';

    let csv = '';
    let filename = '';

    if (type === 'assets') {
      const result = await pool.query(`
        SELECT
          a.asset_name,
          a.qr_code_id,
          a.description,
          a.category,
          a.purchase_cost,
          a.current_status,
          a.current_location,
          a.last_checkout_time,
          u.first_name || ' ' || u.last_name as checked_out_by
        FROM assets a
        LEFT JOIN users u ON a.checked_out_by = u.user_id
        ORDER BY a.asset_name
      `);
      const assets = result.rows;

      // CSV header
      csv = 'Asset Name,QR Code,Description,Category,Purchase Cost,Status,Location,Last Checkout,Checked Out By\n';

      // CSV rows
      for (const asset of assets) {
        csv += `"${escapeCSV(asset.asset_name)}",`;
        csv += `"${escapeCSV(asset.qr_code_id)}",`;
        csv += `"${escapeCSV(asset.description || '')}",`;
        csv += `"${escapeCSV(asset.category || 'Uncategorized')}",`;
        csv += `"${asset.purchase_cost || ''}",`;
        csv += `"${escapeCSV(asset.current_status)}",`;
        csv += `"${escapeCSV(asset.current_location || '')}",`;
        csv += `"${asset.last_checkout_time ? new Date(asset.last_checkout_time).toLocaleString() : ''}",`;
        csv += `"${escapeCSV(asset.checked_out_by || '')}"\n`;
      }

      filename = `sitetally-assets-${formatDate(new Date())}.csv`;

    } else if (type === 'activity') {
      const result = await pool.query(`
        SELECT
          l.action_type,
          l.timestamp,
          l.job_site_name,
          l.notes,
          a.asset_name,
          a.qr_code_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email
        FROM asset_logs l
        JOIN assets a ON l.asset_id = a.asset_id
        JOIN users u ON l.user_id = u.user_id
        ORDER BY l.timestamp DESC
        LIMIT 1000
      `);
      const logs = result.rows;

      // CSV header
      csv = 'Date,Time,Action,Asset Name,QR Code,User,Email,Location,Notes\n';

      // CSV rows
      for (const log of logs) {
        const date = new Date(log.timestamp);
        csv += `"${date.toLocaleDateString()}",`;
        csv += `"${date.toLocaleTimeString()}",`;
        csv += `"${log.action_type === 'CHECK_OUT' ? 'Check Out' : 'Check In'}",`;
        csv += `"${escapeCSV(log.asset_name)}",`;
        csv += `"${escapeCSV(log.qr_code_id)}",`;
        csv += `"${escapeCSV(log.user_name)}",`;
        csv += `"${escapeCSV(log.user_email)}",`;
        csv += `"${escapeCSV(log.job_site_name || '')}",`;
        csv += `"${escapeCSV(log.notes || '')}"\n`;
      }

      filename = `sitetally-activity-${formatDate(new Date())}.csv`;

    } else if (type === 'team') {
      const result = await pool.query(`
        SELECT
          first_name,
          last_name,
          email,
          phone,
          role,
          is_active,
          created_at
        FROM users
        ORDER BY last_name, first_name
      `);
      const users = result.rows;

      // CSV header
      csv = 'First Name,Last Name,Email,Phone,Role,Status,Created\n';

      // CSV rows
      for (const user of users) {
        csv += `"${escapeCSV(user.first_name)}",`;
        csv += `"${escapeCSV(user.last_name)}",`;
        csv += `"${escapeCSV(user.email)}",`;
        csv += `"${escapeCSV(user.phone || '')}",`;
        csv += `"${user.role === 'manager' ? 'Manager' : 'Worker'}",`;
        csv += `"${user.is_active ? 'Active' : 'Inactive'}",`;
        csv += `"${new Date(user.created_at).toLocaleDateString()}"\n`;
      }

      filename = `sitetally-team-${formatDate(new Date())}.csv`;

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid export type' },
        { status: 400 }
      );
    }

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

function escapeCSV(str: string): string {
  if (!str) return '';
  return str.replace(/"/g, '""');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
