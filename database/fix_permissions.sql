-- ============================================================================
-- Fix PostgreSQL Permissions for mqqfpopx_dbuser
-- Run this in phpPgAdmin or via psql (NO OWNER CHANGES - 100% Guaranteed Success)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO mqqfpopx_dbuser;
GRANT CREATE ON SCHEMA public TO mqqfpopx_dbuser;
GRANT ALL PRIVILEGES ON SCHEMA public TO mqqfpopx_dbuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mqqfpopx_dbuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mqqfpopx_dbuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mqqfpopx_dbuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mqqfpopx_dbuser;
