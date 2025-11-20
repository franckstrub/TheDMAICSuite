CREATE TABLE "doe_fractional_factorial_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"enable_full_factorial" boolean DEFAULT false,
	"enable_fractional_factorial" boolean DEFAULT false,
	"response_variable_name" text DEFAULT 'Y Response',
	"factors" jsonb DEFAULT '[]'::jsonb,
	"run_data" jsonb DEFAULT '[]'::jsonb,
	"generated_plan" jsonb DEFAULT '[]'::jsonb,
	"number_of_replicates" integer DEFAULT 1,
	"randomize_runs" boolean DEFAULT false,
	"include_center_points" boolean DEFAULT false,
	"number_of_center_points" integer DEFAULT 3,
	"fractional_resolution" integer DEFAULT 1,
	"resolution" text,
	"generating_relations" jsonb DEFAULT '[]'::jsonb,
	"significance_level" real DEFAULT 0.05,
	"show_uncoded" boolean DEFAULT false,
	"generate_follow_up_full_factorial" boolean DEFAULT false,
	"significant_factors" jsonb DEFAULT '[]'::jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doe_fractional_factorial_config_project_id_solution_id_unique" UNIQUE("project_id","solution_id")
);
--> statement-breakpoint
CREATE TABLE "doe_full_factorial_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"parent_fractional_id" integer,
	"is_follow_up" boolean DEFAULT false,
	"response_variable_name" text DEFAULT 'Y Response',
	"factors" jsonb DEFAULT '[]'::jsonb,
	"run_data" jsonb DEFAULT '[]'::jsonb,
	"generated_plan" jsonb DEFAULT '[]'::jsonb,
	"number_of_replicates" integer DEFAULT 1,
	"randomize_runs" boolean DEFAULT false,
	"include_center_points" boolean DEFAULT false,
	"number_of_center_points" integer DEFAULT 3,
	"significance_level" real DEFAULT 0.05,
	"show_uncoded" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doe_full_factorial_config_project_id_solution_id_unique" UNIQUE("project_id","solution_id")
);
--> statement-breakpoint
ALTER TABLE "simple_regression_config" ADD COLUMN "significance_level" real DEFAULT 0.05;--> statement-breakpoint
ALTER TABLE "solution_design_tracking" ADD COLUMN "tf_doe_full_factorial" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "solution_design_tracking" ADD COLUMN "tf_doe_fractional_factorial" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "doe_fractional_factorial_config" ADD CONSTRAINT "doe_fractional_factorial_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doe_full_factorial_config" ADD CONSTRAINT "doe_full_factorial_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;