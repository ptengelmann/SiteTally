import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { email, password, first_name, last_name, phone_number } = body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, first name, and last name are required' },
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
    const password_hash = await bcrypt.hash(password, 12);

    // Default company ID (in production, this would be handled differently)
    const default_company_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // Create user
    const result = await pool.query(
      `INSERT INTO users (company_id, first_name, last_name, email, phone_number, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING user_id, email, first_name, last_name`,
      [default_company_id, first_name, last_name, email.toLowerCase(), phone_number || null, password_hash]
    );

    return NextResponse.json({
      success: true,
      data: {
        user: result.rows[0],
        message: 'Account created successfully',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
