-- Add is_default column to accounts table
ALTER TABLE "accounts" ADD COLUMN "is_default" boolean DEFAULT false;
