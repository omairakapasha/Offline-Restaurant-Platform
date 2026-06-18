CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "order_id" varchar(36) PRIMARY KEY NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
