import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function addCategories() {
  const client = await pool.connect();

  try {
    console.log('Adding category column to assets table...');

    // Add category column
    await client.query(`
      ALTER TABLE assets
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Uncategorized'
    `);

    console.log('Category column added successfully');

    // Update existing assets with sensible categories based on names
    await client.query(`
      UPDATE assets SET category = 'Generators' WHERE LOWER(asset_name) LIKE '%generator%'
    `);
    await client.query(`
      UPDATE assets SET category = 'Power Tools' WHERE LOWER(asset_name) LIKE '%drill%' OR LOWER(asset_name) LIKE '%saw%'
    `);
    await client.query(`
      UPDATE assets SET category = 'Ladders' WHERE LOWER(asset_name) LIKE '%ladder%'
    `);
    await client.query(`
      UPDATE assets SET category = 'Safety Equipment' WHERE LOWER(asset_name) LIKE '%safety%' OR LOWER(asset_name) LIKE '%harness%'
    `);

    console.log('Updated existing assets with categories');

    // Show results
    const result = await client.query(`
      SELECT asset_name, category FROM assets ORDER BY category, asset_name
    `);
    console.log('\nAssets by category:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addCategories();
