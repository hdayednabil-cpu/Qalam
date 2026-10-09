CREATE TABLE "login_rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "login_rate_limits_expires_idx" ON "login_rate_limits" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE "login_rate_limits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "login_rate_limits" FROM PUBLIC;
--> statement-breakpoint
DO $qalam_login_rate_limits$
DECLARE
  client_role text;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.login_rate_limits FROM %I', client_role);
    END IF;
  END LOOP;
END
$qalam_login_rate_limits$;
