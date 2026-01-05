-- Add account_id column to salary_profiles table
ALTER TABLE "salary_profiles" ADD COLUMN "account_id" integer REFERENCES "accounts"("id");
