-- Add toAccountId column to transactions table for transfer transactions
ALTER TABLE transactions ADD COLUMN to_account_id integer REFERENCES accounts(id);
