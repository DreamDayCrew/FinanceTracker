-- Add affect_transaction and affect_account_balance columns to scheduled_payments table
ALTER TABLE scheduled_payments 
ADD COLUMN affect_transaction BOOLEAN DEFAULT true,
ADD COLUMN affect_account_balance BOOLEAN DEFAULT true;
