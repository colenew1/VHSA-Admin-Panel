-- Add admin column to admin_users table
-- Run this in your Supabase SQL Editor

ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS admin BOOLEAN DEFAULT true;

-- Update existing users to be admins by default (optional)
-- UPDATE admin_users SET admin = true WHERE admin IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN admin_users.admin IS 'Whether the user has admin privileges (true) or is a regular user (false)';

