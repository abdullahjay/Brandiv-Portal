-- Diagnostic: confirms which database/branch you're connected to in Neon,
-- and what tables already exist there. Run this BEFORE re-attempting the
-- upsell migration.

SELECT current_database() AS database, current_schema() AS schema;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
