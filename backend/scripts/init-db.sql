-- Initialize database with extensions (if needed)
-- This file runs when PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance (Django will create the tables)
-- These are additional indexes that may help with common queries
