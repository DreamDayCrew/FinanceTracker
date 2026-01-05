ALTER TABLE savings_goals 
ADD COLUMN affect_transaction BOOLEAN DEFAULT true,
ADD COLUMN affect_account_balance BOOLEAN DEFAULT true;
