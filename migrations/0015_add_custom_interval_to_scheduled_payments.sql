-- Add custom_interval_months and start_month columns to scheduled_payments table for custom frequency support
ALTER TABLE scheduled_payments 
ADD COLUMN IF NOT EXISTS custom_interval_months INTEGER,
ADD COLUMN IF NOT EXISTS start_month INTEGER;
