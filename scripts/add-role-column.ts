import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function addRoleColumn() {
  const client = await pool.connect();

  try {
    console.log('Adding role column to users table...');

    // Add role column with default 'worker'
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'worker' NOT NULL
    `);

    console.log('Role column added successfully');

    // Update Sarah to be a manager
    await client.query(`
      UPDATE users
      SET role = 'manager'
      WHERE email = 'sarah.manager@test.com'
    `);

    console.log('Updated Sarah to manager role');

    // Verify the changes
    const result = await client.query(`
      SELECT user_id, email, first_name, last_name, role
      FROM users
      ORDER BY role, first_name
    `);

    console.log('\nCurrent users:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addRoleColumn();
