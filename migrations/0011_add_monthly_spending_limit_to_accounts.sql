-- Add monthly spending limit for credit cards
ALTER TABLE accounts ADD COLUMN monthly_spending_limit NUMERIC(12, 2);
