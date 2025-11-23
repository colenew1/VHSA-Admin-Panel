-- ==================================================
-- RESTORE ADMIN_USERS, SCREENERS, AND SCHOOLS TABLES
-- ==================================================
-- This restores the data that was accidentally deleted
-- NOTE: You may need to adjust the data based on what you had before

-- Restore Admin Users (Emails)
-- Based on previous conversation: Cole, Erin, Kristen, and others
-- Delete existing first to avoid duplicates
DELETE FROM admin_users WHERE email IN ('cole.new1@gmail.com', 'erinknewman@gmail.com');

INSERT INTO admin_users (email, name, admin, active)
VALUES
  ('cole.new1@gmail.com', 'Cole Newman', true, true),
  ('erinknewman@gmail.com', 'Erin Newman', true, true),
  (NULL, 'Kristen Maracchini', false, true);

-- Restore Schools
-- Delete existing first to avoid duplicates
DELETE FROM schools WHERE name IN ('Ascent Academy', 'St. Michael''s');

INSERT INTO schools (name, active)
VALUES
  ('Ascent Academy', true),
  ('St. Michael''s', true);

-- Restore Screeners
-- Delete existing first to avoid duplicates
DELETE FROM screeners WHERE name IN ('Smith', 'Johnson', 'Williams', 'Brown', 'Davis');

INSERT INTO screeners (name, active)
VALUES
  ('Smith', true),
  ('Johnson', true),
  ('Williams', true),
  ('Brown', true),
  ('Davis', true);

-- Verify restoration
SELECT 
  (SELECT COUNT(*) FROM admin_users) as admin_users_count,
  (SELECT COUNT(*) FROM schools) as schools_count,
  (SELECT COUNT(*) FROM screeners) as screeners_count;

