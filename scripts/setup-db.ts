import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const schemaSQL = `
-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

--
-- 1. USERS Table
--
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--
-- 2. ASSETS Table
--
CREATE TABLE assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_name VARCHAR(100) NOT NULL,
    qr_code_id VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    purchase_cost DECIMAL(10, 2),
    current_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    last_checked_out_by_id UUID,
    last_checkout_time TIMESTAMP WITH TIME ZONE,
    current_location VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (last_checked_out_by_id) REFERENCES users(user_id)
);

--
-- 3. LOGS Table
--
CREATE TABLE logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    job_site_name VARCHAR(100),
    notes TEXT,
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

--
-- INDEXES
--
CREATE INDEX idx_asset_qr_code ON assets (qr_code_id);
CREATE INDEX idx_logs_asset_id ON logs (asset_id);
CREATE INDEX idx_logs_user_id ON logs (user_id);
`;

const seedSQL = `
DO $$
DECLARE
    manager_id UUID;
    worker_id UUID;
    generator_id UUID;
    saw_id UUID;
    compactor_id UUID;
    test_company_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN

    -- 1. SEED USERS TABLE
    INSERT INTO users (company_id, first_name, last_name, email, phone_number, is_active)
    VALUES (test_company_id, 'Sarah', 'Manager', 'sarah.manager@test.com', '555-1001', TRUE)
    RETURNING user_id INTO manager_id;

    INSERT INTO users (company_id, first_name, last_name, email, phone_number, is_active)
    VALUES (test_company_id, 'Tom', 'Worker', 'tom.worker@test.com', '555-1002', TRUE)
    RETURNING user_id INTO worker_id;

    -- 2. SEED ASSETS TABLE
    -- Asset 1: Currently checked out by Tom
    INSERT INTO assets (asset_name, qr_code_id, description, purchase_cost, current_status, last_checked_out_by_id, last_checkout_time, current_location)
    VALUES ('Honda 5000W Generator', 'GEN-456', 'Heavy duty, low hours.', 2500.00, 'CHECKED_OUT', worker_id, NOW() - INTERVAL '4 hours', 'Job Site Alpha')
    RETURNING asset_id INTO generator_id;

    -- Asset 2: Available in warehouse
    INSERT INTO assets (asset_name, qr_code_id, description, purchase_cost, current_status, last_checked_out_by_id, last_checkout_time, current_location)
    VALUES ('Dewalt Circular Saw', 'SAW-101', 'Standard issue saw.', 189.99, 'AVAILABLE', NULL, NULL, 'Warehouse Shelf B')
    RETURNING asset_id INTO saw_id;

    -- Asset 3: In maintenance
    INSERT INTO assets (asset_name, qr_code_id, description, purchase_cost, current_status, last_checked_out_by_id, last_checkout_time, current_location)
    VALUES ('Vibraplate Compactor', 'COMP-789', 'Needs oil change.', 4500.00, 'MAINTENANCE', NULL, NULL, 'Repair Bay 3')
    RETURNING asset_id INTO compactor_id;

    -- Asset 4: Available
    INSERT INTO assets (asset_name, qr_code_id, description, purchase_cost, current_status)
    VALUES ('Hilti Rotary Hammer', 'HIL-222', 'Used for concrete work.', 850.50, 'AVAILABLE');

    -- Asset 5: Checked out by Sarah
    INSERT INTO assets (asset_name, qr_code_id, description, purchase_cost, current_status, last_checked_out_by_id, last_checkout_time, current_location)
    VALUES ('Laser Level Kit', 'LVL-500', 'High-accuracy level.', 599.00, 'CHECKED_OUT', manager_id, NOW() - INTERVAL '1 day', 'Office Trailer');

    -- 3. SEED LOGS TABLE
    -- Generator check-in (5 hours ago)
    INSERT INTO logs (asset_id, user_id, action_type, timestamp, job_site_name)
    VALUES (generator_id, worker_id, 'CHECK_IN', NOW() - INTERVAL '5 hours', 'Warehouse');

    -- Generator check-out (4 hours ago - current state)
    INSERT INTO logs (asset_id, user_id, action_type, timestamp, job_site_name)
    VALUES (generator_id, worker_id, 'CHECK_OUT', NOW() - INTERVAL '4 hours', 'Job Site Alpha');

    -- Saw check-out and check-in history
    INSERT INTO logs (asset_id, user_id, action_type, timestamp, job_site_name)
    VALUES (saw_id, manager_id, 'CHECK_OUT', NOW() - INTERVAL '3 days', 'Downtown Project');

    INSERT INTO logs (asset_id, user_id, action_type, timestamp, job_site_name)
    VALUES (saw_id, manager_id, 'CHECK_IN', NOW() - INTERVAL '2 days', 'Warehouse');

END $$;
`;

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log('Creating schema...');
    await client.query(schemaSQL);
    console.log('Schema created successfully!');

    console.log('Seeding data...');
    await client.query(seedSQL);
    console.log('Seed data inserted successfully!');

    // Verify the data
    const users = await client.query('SELECT user_id, first_name, last_name, email FROM users');
    console.log('\nUsers created:');
    console.table(users.rows);

    const assets = await client.query('SELECT asset_name, qr_code_id, current_status, current_location FROM assets');
    console.log('\nAssets created:');
    console.table(assets.rows);

    const logs = await client.query('SELECT l.action_type, a.asset_name, u.first_name, l.job_site_name FROM logs l JOIN assets a ON l.asset_id = a.asset_id JOIN users u ON l.user_id = u.user_id ORDER BY l.timestamp');
    console.log('\nLog entries:');
    console.table(logs.rows);

  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
