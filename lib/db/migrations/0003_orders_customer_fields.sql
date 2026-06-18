-- customer_name and customer_phone were missing from the initial migration.
-- IF NOT EXISTS makes this idempotent — safe to run on DBs that already have the columns.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_name" varchar(100);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_phone" varchar(20);
