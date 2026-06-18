DO $$ BEGIN
 CREATE TYPE "order_status" AS ENUM('received', 'preparing', 'ready', 'served', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "staff_role" AS ENUM('admin', 'kitchen', 'waiter');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "table_status" AS ENUM('available', 'occupied', 'reserved');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(100),
	"details" text,
	"ip_address" varchar(50),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"category" varchar(50) NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"prep_time" integer DEFAULT 10 NOT NULL,
	"image_url" varchar(255),
	"is_vegetarian" boolean DEFAULT false NOT NULL,
	"spice_level" integer DEFAULT 0 NOT NULL,
	"allergens" json DEFAULT '[]'::json NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"stock_quantity" integer DEFAULT -1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"special_instructions" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" varchar(20),
	"to_status" varchar(20) NOT NULL,
	"changed_by" integer,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" integer NOT NULL,
	"staff_id" integer,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" "order_status" DEFAULT 'received' NOT NULL,
	"customer_name" varchar(100),
	"customer_phone" varchar(20),
	"special_instructions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"estimated_ready_time" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"staff_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(50),
	"user_agent" varchar(255),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"role" "staff_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp,
	CONSTRAINT "staff_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_number" integer NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"status" "table_status" DEFAULT 'available' NOT NULL,
	"qr_token" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tables_table_number_unique" UNIQUE("table_number"),
	CONSTRAINT "tables_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_staff_id_fk" FOREIGN KEY ("changed_by") REFERENCES "staff"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
