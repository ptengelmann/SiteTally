import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addAuthColumn() {
  const client = await pool.connect();

  try {
    // Add password_hash column if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `);
    console.log('Added password_hash column to users table');

    // Set a default password for existing test users
    const defaultPassword = await bcrypt.hash('password123', 12);

    await client.query(`
      UPDATE users
      SET password_hash = $1
      WHERE password_hash IS NULL
    `, [defaultPassword]);

    console.log('Set default password for existing users (password123)');

    // Show updated users
    const users = await client.query('SELECT user_id, email, first_name, last_name FROM users');
    console.log('\nUsers with auth enabled:');
    console.table(users.rows);

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addAuthColumn();
