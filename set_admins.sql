-- Set only Erin Newman, Cole Newman, and Kristen Maracchini as admins
-- All other users will be set to admin = false

-- First, set everyone to NOT admin
UPDATE admin_users 
SET admin = false;

-- Then set the three specific users to admin
UPDATE admin_users 
SET admin = true 
WHERE name IN ('Erin Newman', 'Cole Newman', 'Kristen Maracchini');

-- Verify the changes
SELECT name, phone_number, admin, active 
FROM admin_users 
ORDER BY admin DESC, name;

