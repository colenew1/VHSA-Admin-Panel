-- Migrate admin_users table from phone_number to email
-- Run this in your Supabase SQL Editor

-- Step 1: Add email column
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Step 2: Drop the unique constraint on phone_number (if it exists)
-- We'll keep phone_number column for now but make it nullable and non-unique
ALTER TABLE admin_users 
ALTER COLUMN phone_number DROP NOT NULL;

-- Drop unique index on phone_number if it exists
DROP INDEX IF EXISTS idx_admin_users_phone;
DROP INDEX IF EXISTS idx_admin_users_phone_unique;

-- Step 3: Add unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email 
ON admin_users(email) 
WHERE email IS NOT NULL;

-- Step 4: Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email_lookup 
ON admin_users(email);

-- Step 5: Update existing users with emails
UPDATE admin_users 
SET email = 'cole.new1@gmail.com' 
WHERE name = 'Cole Newman';

UPDATE admin_users 
SET email = 'erinknewman@gmail.com' 
WHERE name = 'Erin Newman';

-- Kristen stays NULL (already null, but explicit)
UPDATE admin_users 
SET email = NULL 
WHERE name = 'Kristen Maracchini';

-- Step 6: Verify the changes
SELECT name, email, phone_number, admin, active 
FROM admin_users 
ORDER BY name;

-- Note: phone_number column is kept for backward compatibility but is no longer used for authentication

