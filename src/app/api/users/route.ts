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

interface UsersResponse {
  users: User[];
  total: number;
}

// GET - Fetch all users (managers only)
export async function GET(): Promise<NextResponse<ApiResponse<UsersResponse>>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Only managers can view user list
  if (session.user.role !== 'manager') {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Manager access required' },
      { status: 403 }
    );
  }

  try {
    const result = await pool.query(`
      SELECT
        user_id,
        email,
        first_name,
        last_name,
        phone,
        role,
        is_active,
        created_at
      FROM users
      ORDER BY
        CASE WHEN role = 'manager' THEN 0 ELSE 1 END,
        first_name, last_name
    `);

    return NextResponse.json({
      success: true,
      data: {
        users: result.rows,
        total: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user (managers only)
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<User>>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Only managers can create users
  if (session.user.role !== 'manager') {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Manager access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, first_name, last_name, phone, role } = body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, first name, and last name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['worker', 'manager'];
    const userRole = role && validRoles.includes(role) ? role : 'worker';

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, email, first_name, last_name, phone, role, is_active, created_at`,
      [email.toLowerCase(), hashedPassword, first_name, last_name, phone || null, userRole]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
