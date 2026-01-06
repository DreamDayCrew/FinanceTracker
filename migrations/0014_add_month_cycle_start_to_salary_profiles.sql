-- Add month cycle start fields to salary_profiles table
ALTER TABLE "salary_profiles" ADD COLUMN "month_cycle_start_rule" varchar(30) DEFAULT 'salary_day';
ALTER TABLE "salary_profiles" ADD COLUMN "month_cycle_start_day" integer;
