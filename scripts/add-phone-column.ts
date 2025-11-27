import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function addPhoneColumn() {
  const client = await pool.connect();

  try {
    console.log('Adding phone column to users table...');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    `);

    console.log('Phone column added successfully');

    // Show current users
    const result = await client.query(`
      SELECT user_id, email, first_name, last_name, role, phone FROM users
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

addPhoneColumn();
