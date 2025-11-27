import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { ApiResponse } from '@/types';
import bcrypt from 'bcryptjs';

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

// GET - Fetch single user (managers only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<ApiResponse<User>>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Only managers can view user details (or the user themselves)
  const { userId } = await params;
  if (session.user.role !== 'manager' && session.user.id !== userId) {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Manager access required' },
      { status: 403 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT user_id, email, first_name, last_name, phone, role, is_active, created_at
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT - Update user (managers only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<ApiResponse<User>>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Only managers can update users
  if (session.user.role !== 'manager') {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Manager access required' },
      { status: 403 }
    );
  }

  try {
    const { userId } = await params;
    const body = await request.json();
    const { first_name, last_name, phone, role, is_active, password } = body;

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json(
        { success: false, error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Validate role if provided
    const validRoles = ['worker', 'manager'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Prevent managers from demoting themselves
    if (userId === session.user.id && role === 'worker') {
      return NextResponse.json(
        { success: false, error: 'You cannot demote yourself' },
        { status: 400 }
      );
    }

    // Prevent managers from deactivating themselves
    if (userId === session.user.id && is_active === false) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate yourself' },
        { status: 400 }
      );
    }

    // Build update query
    let query = `
      UPDATE users
      SET first_name = $1,
          last_name = $2,
          phone = $3,
          role = COALESCE($4, role),
          is_active = COALESCE($5, is_active)
    `;
    const queryParams: (string | boolean | null)[] = [
      first_name,
      last_name,
      phone || null,
      role || null,
      typeof is_active === 'boolean' ? is_active : null,
    ];

    // If password is provided, update it too
    if (password && password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password_hash = $6 WHERE user_id = $7`;
      queryParams.push(hashedPassword, userId);
    } else {
      query += ` WHERE user_id = $6`;
      queryParams.push(userId);
    }

    query += ` RETURNING user_id, email, first_name, last_name, phone, role, is_active, created_at`;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate user (soft delete, managers only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Only managers can delete users
  if (session.user.role !== 'manager') {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Manager access required' },
      { status: 403 }
    );
  }

  try {
    const { userId } = await params;

    // Prevent managers from deleting themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate yourself' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE users SET is_active = FALSE WHERE user_id = $1 RETURNING user_id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'User deactivated successfully' },
    });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate user' },
      { status: 500 }
    );
  }
}
