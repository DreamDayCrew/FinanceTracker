-- Add create_transaction and affect_balance columns to loans table
ALTER TABLE loans ADD COLUMN create_transaction boolean DEFAULT false;
ALTER TABLE loans ADD COLUMN affect_balance boolean DEFAULT false;
