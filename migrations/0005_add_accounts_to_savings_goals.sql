-- Add account columns to savings_goals table
ALTER TABLE "savings_goals" ADD COLUMN "account_id" integer REFERENCES "accounts"("id");
ALTER TABLE "savings_goals" ADD COLUMN "to_account_id" integer REFERENCES "accounts"("id");
