-- Add affect_transaction and affect_account_balance columns to payment_occurrences table
ALTER TABLE payment_occurrences 
ADD COLUMN affect_transaction BOOLEAN DEFAULT true,
ADD COLUMN affect_account_balance BOOLEAN DEFAULT true;
