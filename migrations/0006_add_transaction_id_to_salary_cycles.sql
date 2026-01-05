-- Add transaction_id to salary_cycles table
ALTER TABLE salary_cycles ADD COLUMN transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL;
