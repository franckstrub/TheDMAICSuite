CREATE TABLE "multiple_regression_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"response_variable_name" text DEFAULT 'Y',
	"predictor_names" jsonb DEFAULT '["X1","X2","X3"]'::jsonb,
	"data_y" jsonb DEFAULT '[]'::jsonb,
	"data_x" jsonb DEFAULT '[]'::jsonb,
	"selected_predictors" jsonb DEFAULT '[]'::jsonb,
	"significance_level" real DEFAULT 0.05,
	"target_y" real,
	"solve_for_predictor_idx" integer,
	"constraint_values" jsonb DEFAULT '{}'::jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "multiple_regression_config_project_id_solution_id_unique" UNIQUE("project_id","solution_id")
);
--> statement-breakpoint
ALTER TABLE "multiple_regression_config" ADD CONSTRAINT "multiple_regression_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;