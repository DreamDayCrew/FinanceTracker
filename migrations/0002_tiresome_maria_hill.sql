ALTER TABLE "accounts" ADD COLUMN "is_default" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "salary_profiles" ADD COLUMN "account_id" integer;--> statement-breakpoint
ALTER TABLE "scheduled_payments" ADD COLUMN "account_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_occurrence_id" integer;--> statement-breakpoint
ALTER TABLE "salary_profiles" ADD CONSTRAINT "salary_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_payments" ADD CONSTRAINT "scheduled_payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;