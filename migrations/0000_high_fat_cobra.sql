CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"project_id" integer,
	"action" text NOT NULL,
	"details" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anova_two_way_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"factor_a_name" text DEFAULT 'Factor A',
	"factor_b_name" text DEFAULT 'Factor B',
	"response_variable_name" text DEFAULT 'Response',
	"factor_a_levels" jsonb DEFAULT '[]'::jsonb,
	"factor_b_levels" jsonb DEFAULT '[]'::jsonb,
	"cell_data" jsonb DEFAULT '{}'::jsonb,
	"include_interaction" boolean DEFAULT true,
	"significance_level" real DEFAULT 0.05,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anova_two_way_config_project_id_solution_id_unique" UNIQUE("project_id","solution_id")
);
--> statement-breakpoint
CREATE TABLE "attribute_ctq_analysis_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"enable_attr_y_hypothesis_test" boolean DEFAULT false,
	"enable_pareto" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attribute_ctq_analysis_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "attribute_hypothesis_testing_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'Attribute Hyp-Test',
	"enable_two_proportion_test" boolean DEFAULT true,
	"enable_chi_square_test" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attribute_hypothesis_testing_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "before_after_chi_square_test" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"significance_level" text DEFAULT '0.05',
	"variable1_name" text DEFAULT 'Time Period',
	"variable2_name" text DEFAULT 'Outcome',
	"variable1_categories" jsonb DEFAULT '["Before","After"]'::jsonb,
	"variable2_categories" jsonb DEFAULT '["Category 1","Category 2"]'::jsonb,
	"observed_frequencies" text DEFAULT '',
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "before_after_chi_square_test_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "before_after_cont_ctq_two_sample_test" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'Before-After Two Sample Test',
	"enable_mean_test" boolean DEFAULT true,
	"enable_variance_test" boolean DEFAULT false,
	"enable_median_test" boolean DEFAULT false,
	"delta_mean_0" real DEFAULT 0,
	"ratio_variance_0" real DEFAULT 1,
	"significance_level" text DEFAULT '0.05',
	"alternativemean" text DEFAULT 'Less than',
	"alternativevariance" text DEFAULT 'Less than',
	"alternativemedian" text DEFAULT 'Less than',
	"data_set_1" jsonb DEFAULT '[]'::jsonb,
	"data_set_2" jsonb DEFAULT '[]'::jsonb,
	"dataset_1_description" text DEFAULT 'Before',
	"dataset_2_description" text DEFAULT 'After',
	"enable_mean_2s_power" boolean DEFAULT false,
	"power_2s_mean_power" text,
	"power_2s_mean_ha" text,
	"power_2s_mean_mean_1" real,
	"power_2s_mean_mean_2" real,
	"power_2s_mean_stdev" real,
	"power_2s_mean_alpha" text,
	"enable_variance_2s_power" boolean DEFAULT false,
	"power_2s_variance_power" text,
	"power_2s_variance_ha" text,
	"power_2s_variance_stdev_1" real,
	"power_2s_variance_stdev_2" real,
	"power_2s_variance_alpha" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "before_after_cont_ctq_two_sample_test_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "before_after_two_proportion_test" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'Before-After Two Proportion Test',
	"hypothesized_difference" real DEFAULT 0,
	"sample1_size" integer,
	"sample1_events" integer,
	"sample2_size" integer,
	"sample2_events" integer,
	"sample1_description" text DEFAULT 'Before',
	"sample2_description" text DEFAULT 'After',
	"significance_level" text DEFAULT '0.05',
	"alternative" text DEFAULT 'Different',
	"enable_power_analysis" boolean DEFAULT false,
	"power_target_power" real,
	"power_alpha" real,
	"power_ha" text,
	"power_p1" real,
	"power_p2" real,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "before_after_two_proportion_test_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "business_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"requirement" text NOT NULL,
	"business_need" text,
	"importance" integer NOT NULL,
	"ctq" text DEFAULT '' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cause_effect_matrix" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"root_causes" json,
	"ctqs" json,
	"importance_scores" json,
	"matrix" json,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chi_square_independence_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'Chi-Square Independence Test',
	"significance_level" text DEFAULT '0.05',
	"variable_1_name" text,
	"variable_1_categories" text[],
	"variable_2_name" text,
	"variable_2_categories" text[],
	"observed_frequencies" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chi_square_independence_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "continuous_ctq_analysis_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"enable_cont_y_hypothesis_test" boolean DEFAULT true,
	"enable_cont_y_multi_vari_chart" boolean DEFAULT false,
	"enable_pareto" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "continuous_ctq_analysis_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "cts_characteristics" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"operational_definition" text,
	"ctq_type" text DEFAULT 'Continuous' NOT NULL,
	"unit" text,
	"target_percent_defects" real,
	"target" real,
	"lsl" real,
	"usl" real,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"requirement" text NOT NULL,
	"customer_requirement" text,
	"importance" integer NOT NULL,
	"CTS" text DEFAULT '' NOT NULL,
	"ctq" text DEFAULT '',
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_collection_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"operational_definition" text,
	"data_type" text,
	"point_of_measure" text DEFAULT 'Output',
	"collection_method" text DEFAULT 'Random',
	"collection_method_comment" text,
	"sample_size" integer,
	"dates_time_frequency" text,
	"measurement_system" text,
	"data_source" text,
	"responsible" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" integer,
	"records" integer DEFAULT 0 NOT NULL,
	"variables" integer DEFAULT 0 NOT NULL,
	"storage_type" text NOT NULL,
	"storage_location" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fishbone_diagrams" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"diagram_data" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmea_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"fmea_rows" jsonb DEFAULT '[]'::jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_analysis_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "gantt_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"dependencies" text,
	"assignee" text,
	"priority" text DEFAULT 'medium',
	"phase" text NOT NULL,
	"status" text DEFAULT 'not-started',
	"parent_id" integer,
	"sequence" integer DEFAULT 0,
	"comments" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_review_deliverables" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"phase" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_required" text DEFAULT 'Required' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"file_attachment" text,
	"file_original_name" text,
	"file_size" integer,
	"file_type" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_review_validators" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"phase" text NOT NULL,
	"validator_name" text NOT NULL,
	"validator_role" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"comments" text,
	"validated_date" timestamp,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hypothesis_testing_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"enable_one_sample_test" boolean DEFAULT true,
	"enable_two_sample_test" boolean DEFAULT false,
	"enable_paired_sample_test" boolean DEFAULT false,
	"enable_multiple_sample_test" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hypothesis_testing_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "implementation_plan_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"task_name" text NOT NULL,
	"description" text,
	"solution_id" text,
	"owner" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'Not Started' NOT NULL,
	"is_pilot_task" boolean DEFAULT false,
	"progress_percentage" integer DEFAULT 0,
	"notes" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "msa_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer,
	"ctq" text NOT NULL,
	"msa_type" text DEFAULT 'Gage R&R' NOT NULL,
	"unit_appraised_type" text DEFAULT 'Part',
	"unit_appraised_type_other" text,
	"appraiser1_name" text,
	"appraiser2_name" text,
	"appraiser3_name" text,
	"agreement_analysis_data" text,
	"gage_rr_data" text,
	"sigma_multiplier" real DEFAULT 6,
	"tolerance" real,
	"repetitions" integer DEFAULT 2,
	"number_of_appraisers" integer DEFAULT 2,
	"show_statistics" boolean DEFAULT false,
	"study_date_time" timestamp,
	"justification" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multi_vari_chart_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"factor1_name" text DEFAULT 'Factor 1',
	"factor2_name" text DEFAULT 'Factor 2',
	"factor3_name" text DEFAULT 'Factor 3',
	"data" jsonb DEFAULT '[]'::jsonb,
	"show_mean" boolean DEFAULT true,
	"use_factor3" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "multi_vari_chart_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "multiple_sample_hypothesis_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'Multiple-Sample Hyp test',
	"factor_of_classification" text,
	"enable_mean_test" boolean DEFAULT true,
	"enable_variance_test" boolean DEFAULT false,
	"enable_median_test" boolean DEFAULT false,
	"significance_level" text DEFAULT '0.05',
	"alternate_mean" text DEFAULT 'Less than',
	"alternate_variance" text DEFAULT 'Less than',
	"alternate_median" text DEFAULT 'Less than',
	"datasets" jsonb DEFAULT '[]'::jsonb,
	"dataset_descriptions" jsonb DEFAULT '[]'::jsonb,
	"enable_mean_multiple_s_power" boolean DEFAULT false,
	"power_power" text,
	"power_alpha" text,
	"power_nbr_distri" integer,
	"power_difference" real,
	"power_stdev" real,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "multiple_sample_hypothesis_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "one_sample_hypothesis_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'One Sample Hyp-Test',
	"enable_mean_test" boolean DEFAULT true,
	"enable_variance_test" boolean DEFAULT false,
	"enable_median_test" boolean DEFAULT false,
	"target_mean" real,
	"target_stdev" real,
	"target_median" real,
	"significance_level" text DEFAULT '0.05',
	"alternativemean" text DEFAULT 'Less than',
	"alternativevariance" text DEFAULT 'Less than',
	"alternativemedian" text DEFAULT 'Less than',
	"data_points" jsonb DEFAULT '[]'::jsonb,
	"dataset_description" text,
	"enable_mean_1s_power" boolean DEFAULT false,
	"power_1s_mean_power" text,
	"power_1s_mean_ha" text,
	"power_1s_mean_mean" real,
	"power_1s_mean_h0" real,
	"power_1s_mean_stdev" real,
	"power_1s_mean_alpha" text,
	"enable_variance_1s_power" boolean DEFAULT false,
	"power_1s_variance_power" text,
	"power_1s_variance_ha" text,
	"power_1s_variance_stdev" real,
	"power_1s_variance_h0" real,
	"power_1s_variance_alpha" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "one_sample_hypothesis_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"is_system_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"subscription_tier" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "paired_sample_hypothesis_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'Paired Sample Hyp-Test',
	"enable_mean_test" boolean DEFAULT true,
	"h0_difference" real DEFAULT 0,
	"significance_level" text DEFAULT '0.05',
	"alternativemean" text DEFAULT 'Less than',
	"data_set_1" jsonb DEFAULT '[]'::jsonb,
	"data_set_2" jsonb DEFAULT '[]'::jsonb,
	"dataset_1_description" text,
	"dataset_2_description" text,
	"enable_mean_1s_power" boolean DEFAULT false,
	"power_1s_mean_power" text,
	"power_1s_mean_ha" text,
	"power_1s_mean_mean" real,
	"power_1s_mean_h0" real,
	"power_1s_mean_stdev" real,
	"power_1s_mean_alpha" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paired_sample_hypothesis_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "pareto_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"category_type" text DEFAULT 'Defects' NOT NULL,
	"category_type_custom" text,
	"frequency_type" text DEFAULT 'Count' NOT NULL,
	"frequency_type_custom" text,
	"selected_variable" text,
	"pareto_data" jsonb DEFAULT '[]'::jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pareto_analysis_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "process_capability" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer,
	"ctq" text NOT NULL,
	"lsl" text,
	"usl" text,
	"target" text,
	"z_shift" real DEFAULT 1.5,
	"data_set_term" text DEFAULT 'Long Term',
	"capability_index" text DEFAULT 'Cp/Cpk',
	"show_percentage" boolean DEFAULT false,
	"show_z" boolean DEFAULT false,
	"show_statistics" boolean DEFAULT false,
	"data_points" jsonb DEFAULT '[]'::jsonb,
	"enable_non_conformity" boolean DEFAULT false,
	"enable_dpmo" boolean DEFAULT false,
	"enable_rty" boolean DEFAULT false,
	"enable_oee" boolean DEFAULT false,
	"enable_pareto" boolean DEFAULT false,
	"enable_dpu" boolean DEFAULT false,
	"non_conformity_units" integer,
	"total_units" integer,
	"dpmo_defects" integer,
	"dpmo_units" integer,
	"dpmo_opportunities_per_unit" integer,
	"rty_process_steps" json,
	"oee_scheduled_time" real,
	"oee_available_time" real,
	"oee_nominal_capacity" integer,
	"oee_parts_manufactured" integer,
	"oee_bad_parts" integer,
	"pareto_defect_categories" json,
	"dpu_defects" integer,
	"dpu_units" integer,
	"capability_assessment" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"dataset_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_maps" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"as_is_diagram_data" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_raci_matrix" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"raci_data" jsonb NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_charters" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"project_title" text,
	"project_reference_number" text,
	"project_leader" text,
	"sponsor" text,
	"sponsor_function" text,
	"stakeholders" jsonb,
	"team_members" jsonb,
	"stakeholder" text,
	"stakeholder_function" text,
	"financial_controller" text,
	"project_coach" text,
	"belt_level" text,
	"coach_belt_level" text,
	"project_type" text,
	"project_category" text,
	"project_typology" text,
	"business_case" text,
	"problem_statement" text,
	"goals" text,
	"scope" text,
	"project_image" text,
	"start_date" text,
	"target_end_date" text,
	"savings_per_year" text,
	"working_capital_gains" text,
	"wacc_percentage" text,
	"financial_savings" text,
	"fte_benefits" text,
	"fte_working_days_per_year" text,
	"fte_working_hours_per_day" text,
	"fte_time_unit" text,
	"fte_saved_hours" text,
	"fte_cost_per_year" text,
	"fte_calculated_value" text,
	"soft_benefits" text,
	"kick_off_date" text,
	"define_phase_date" text,
	"measure_phase_date" text,
	"analyze_phase_date" text,
	"improve_phase_date" text,
	"control_phase_date" text,
	"one_off_people_cost" text,
	"one_off_technology_cost" text,
	"one_off_other_cost" text,
	"one_off_other_explanation" text,
	"opex_people_cost" text,
	"opex_technology_cost" text,
	"opex_other_cost" text,
	"opex_other_explanation" text,
	"opex_period" text,
	"capex_cost" text,
	"capex_explanation" text,
	"total_financial_savings" text,
	"total_project_costs" text,
	"project_net_value" text,
	"roi" text,
	"breakeven" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_raci_matrix" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"raci_data" jsonb NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_risks" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"risk_name" text NOT NULL,
	"probability" text NOT NULL,
	"impact" text NOT NULL,
	"risk_criticality" integer NOT NULL,
	"mitigation_plan" text,
	"risk_owner" text,
	"risk_name2" text,
	"probability2" text,
	"impact2" text,
	"risk_criticality2" integer,
	"mitigation_plan2" text,
	"risk_owner2" text,
	"risk_name3" text,
	"probability3" text,
	"impact3" text,
	"risk_criticality3" integer,
	"mitigation_plan3" text,
	"risk_owner3" text,
	"risk_name4" text,
	"probability4" text,
	"impact4" text,
	"risk_criticality4" integer,
	"mitigation_plan4" text,
	"risk_owner4" text,
	"risk_name5" text,
	"probability5" text,
	"impact5" text,
	"risk_criticality5" integer,
	"mitigation_plan5" text,
	"risk_owner5" text,
	"risk_name6" text,
	"probability6" text,
	"impact6" text,
	"risk_criticality6" integer,
	"mitigation_plan6" text,
	"risk_owner6" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_type" text DEFAULT 'Green Belt',
	"project_category" text DEFAULT 'Process Improvement',
	"project_typology" text DEFAULT 'Project',
	"current_phase" text DEFAULT 'define' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"target_end_date" date,
	"actual_end_date" date,
	"created_by" integer NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"benefits" jsonb,
	"costs" jsonb,
	"soft_benefits" jsonb,
	"elevator_speech" text,
	"gantt_view_mode" text DEFAULT 'months'
);
--> statement-breakpoint
CREATE TABLE "proof_of_improvement_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"enable_two_proportion_test" boolean DEFAULT true,
	"enable_chi_square_test" boolean DEFAULT true,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "proof_of_improvement_preferences_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "root_cause_prioritization" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"rootcause" text NOT NULL,
	"multivotescore" real DEFAULT 0 NOT NULL,
	"criticalrootcause" boolean DEFAULT false NOT NULL,
	"firstwhy" text DEFAULT '',
	"secondwhy" text DEFAULT '',
	"thirdwhy" text DEFAULT '',
	"fourthwhy" text DEFAULT '',
	"fifthwhy" text DEFAULT '',
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simple_regression_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"enable_linear" boolean DEFAULT false,
	"enable_quadratic" boolean DEFAULT false,
	"enable_cubic" boolean DEFAULT false,
	"dataset_y_description" text DEFAULT 'Y Variable',
	"dataset_x_description" text DEFAULT 'X Variable',
	"data_y" jsonb DEFAULT '[]'::jsonb,
	"data_x" jsonb DEFAULT '[]'::jsonb,
	"target_y" real,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "simple_regression_config_project_id_solution_id_unique" UNIQUE("project_id","solution_id")
);
--> statement-breakpoint
CREATE TABLE "sipoc_diagrams" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"process_name" text,
	"suppliers" text,
	"inputs" text,
	"process" text,
	"outputs" text,
	"customers" text,
	"suppliers2" text,
	"inputs2" text,
	"process2" text,
	"outputs2" text,
	"customers2" text,
	"suppliers3" text,
	"inputs3" text,
	"process3" text,
	"outputs3" text,
	"customers3" text,
	"suppliers4" text,
	"inputs4" text,
	"process4" text,
	"outputs4" text,
	"customers4" text,
	"suppliers5" text,
	"inputs5" text,
	"process5" text,
	"outputs5" text,
	"customers5" text,
	"suppliers6" text,
	"inputs6" text,
	"process6" text,
	"outputs6" text,
	"customers6" text,
	"suppliers7" text,
	"inputs7" text,
	"process7" text,
	"outputs7" text,
	"customers7" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_design_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"to_be_process_map" boolean DEFAULT false,
	"to_be_process_raci" boolean DEFAULT false,
	"transfer_function" boolean DEFAULT false,
	"other_design" boolean DEFAULT false,
	"other_design_explanation" text,
	"other_design_file" text,
	"solution_not_pursued" boolean DEFAULT false,
	"tf_simple_regression" boolean DEFAULT false,
	"tf_anova_two_way" boolean DEFAULT false,
	"tf_multiple_regression" boolean DEFAULT false,
	"tf_doe" boolean DEFAULT false,
	"tf_logistic_regression" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "solution_design_tracking_project_id_solution_id_unique" UNIQUE("project_id","solution_id")
);
--> statement-breakpoint
CREATE TABLE "solution_process_maps" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"diagram_data" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"solution_id" text NOT NULL,
	"solution" text NOT NULL,
	"category" text NOT NULL,
	"critical_root_causes" text NOT NULL,
	"benefit" text,
	"effort" text,
	"comments" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakeholder_analysis_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"stakeholder_name" text NOT NULL,
	"stakeholder_role" text,
	"interest_level" text DEFAULT 'Medium' NOT NULL,
	"resistance_type" text,
	"influence_level" text DEFAULT 'Medium' NOT NULL,
	"support_level" text DEFAULT 'Neutral' NOT NULL,
	"engagement_strategy" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"cloud_enabled" boolean DEFAULT true NOT NULL,
	"cloud_region" text,
	"cloud_retention" text,
	"cloud_encryption" boolean,
	"server_enabled" boolean DEFAULT false NOT NULL,
	"server_address" text,
	"server_port" text,
	"server_db_type" text,
	"server_auth_type" text,
	"local_enabled" boolean DEFAULT false NOT NULL,
	"local_directory" text,
	"local_format" text,
	"local_backups" boolean,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_proportion_hypothesis_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'Two-Proportion Test',
	"hypothesized_difference" real DEFAULT 0,
	"significance_level" text DEFAULT '0.05',
	"alternative" text DEFAULT 'Different',
	"sample_1_size" integer,
	"sample_1_events" integer,
	"sample_1_description" text,
	"sample_2_size" integer,
	"sample_2_events" integer,
	"sample_2_description" text,
	"enable_power_analysis" boolean DEFAULT false,
	"power_target_power" real,
	"power_alpha" real,
	"power_ha" text,
	"power_p1" real,
	"power_p2" real,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "two_proportion_hypothesis_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "two_sample_hypothesis_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ctq_id" integer NOT NULL,
	"ctq" text NOT NULL,
	"test_type" text DEFAULT 'Two Sample Hyp-Test',
	"enable_mean_test" boolean DEFAULT true,
	"enable_variance_test" boolean DEFAULT false,
	"enable_median_test" boolean DEFAULT false,
	"delta_mean_0" real DEFAULT 0,
	"ratio_variance_0" real DEFAULT 1,
	"significance_level" text DEFAULT '0.05',
	"alternativemean" text DEFAULT 'Less than',
	"alternativevariance" text DEFAULT 'Less than',
	"alternativemedian" text DEFAULT 'Less than',
	"data_set_1" jsonb DEFAULT '[]'::jsonb,
	"data_set_2" jsonb DEFAULT '[]'::jsonb,
	"dataset_1_description" text,
	"dataset_2_description" text,
	"enable_mean_2s_power" boolean DEFAULT false,
	"power_2s_mean_power" text,
	"power_2s_mean_ha" text,
	"power_2s_mean_mean_1" real,
	"power_2s_mean_mean_2" real,
	"power_2s_mean_stdev" real,
	"power_2s_mean_alpha" text,
	"enable_variance_2s_power" boolean DEFAULT false,
	"power_2s_variance_power" text,
	"power_2s_variance_ha" text,
	"power_2s_variance_stdev_1" real,
	"power_2s_variance_stdev_2" real,
	"power_2s_variance_alpha" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "two_sample_hypothesis_config_project_id_ctq_id_unique" UNIQUE("project_id","ctq_id")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" integer NOT NULL,
	"email_notifications" boolean DEFAULT true,
	"project_updates" boolean DEFAULT true,
	"phase_reminders" boolean DEFAULT false,
	"weekly_reports" boolean DEFAULT true,
	"theme" text DEFAULT 'light',
	"language" text DEFAULT 'en',
	"timezone" text DEFAULT 'UTC',
	"currency" text DEFAULT 'USD',
	"date_format" text DEFAULT 'MM/DD/YYYY',
	"profile_visibility" text DEFAULT 'team',
	"data_sharing" boolean DEFAULT false,
	"analytics_opt_in" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"profile_image_url" text,
	"phone" text,
	"phone_country_code" text,
	"company_name" text,
	"role" text DEFAULT 'admin',
	"billing_address" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "value_time_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"show_value_analysis" boolean DEFAULT false,
	"show_time_analysis" boolean DEFAULT false,
	"va_time" real,
	"bva_time" real,
	"nva_time" real,
	"customer_demand" real,
	"demand_periodicity" text DEFAULT 'year',
	"working_days_per_period" real,
	"effective_working_time" real,
	"number_of_shifts" integer DEFAULT 1,
	"wip" real,
	"task_data" jsonb DEFAULT '[]'::jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "value_time_analysis_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anova_two_way_config" ADD CONSTRAINT "anova_two_way_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_ctq_analysis_config" ADD CONSTRAINT "attribute_ctq_analysis_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_ctq_analysis_config" ADD CONSTRAINT "attribute_ctq_analysis_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_hypothesis_testing_config" ADD CONSTRAINT "attribute_hypothesis_testing_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_hypothesis_testing_config" ADD CONSTRAINT "attribute_hypothesis_testing_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_chi_square_test" ADD CONSTRAINT "before_after_chi_square_test_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_chi_square_test" ADD CONSTRAINT "before_after_chi_square_test_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_cont_ctq_two_sample_test" ADD CONSTRAINT "before_after_cont_ctq_two_sample_test_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_cont_ctq_two_sample_test" ADD CONSTRAINT "before_after_cont_ctq_two_sample_test_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_two_proportion_test" ADD CONSTRAINT "before_after_two_proportion_test_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_two_proportion_test" ADD CONSTRAINT "before_after_two_proportion_test_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_requirements" ADD CONSTRAINT "business_requirements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cause_effect_matrix" ADD CONSTRAINT "cause_effect_matrix_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chi_square_independence_config" ADD CONSTRAINT "chi_square_independence_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chi_square_independence_config" ADD CONSTRAINT "chi_square_independence_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "continuous_ctq_analysis_config" ADD CONSTRAINT "continuous_ctq_analysis_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "continuous_ctq_analysis_config" ADD CONSTRAINT "continuous_ctq_analysis_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cts_characteristics" ADD CONSTRAINT "cts_characteristics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_requirements" ADD CONSTRAINT "customer_requirements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_collection_plans" ADD CONSTRAINT "data_collection_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fishbone_diagrams" ADD CONSTRAINT "fishbone_diagrams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fishbone_diagrams" ADD CONSTRAINT "fishbone_diagrams_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_analysis" ADD CONSTRAINT "fmea_analysis_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_review_deliverables" ADD CONSTRAINT "gate_review_deliverables_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_review_validators" ADD CONSTRAINT "gate_review_validators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypothesis_testing_config" ADD CONSTRAINT "hypothesis_testing_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypothesis_testing_config" ADD CONSTRAINT "hypothesis_testing_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implementation_plan_tasks" ADD CONSTRAINT "implementation_plan_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "msa_analysis" ADD CONSTRAINT "msa_analysis_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "msa_analysis" ADD CONSTRAINT "msa_analysis_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multi_vari_chart_config" ADD CONSTRAINT "multi_vari_chart_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multi_vari_chart_config" ADD CONSTRAINT "multi_vari_chart_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multiple_sample_hypothesis_config" ADD CONSTRAINT "multiple_sample_hypothesis_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multiple_sample_hypothesis_config" ADD CONSTRAINT "multiple_sample_hypothesis_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "one_sample_hypothesis_config" ADD CONSTRAINT "one_sample_hypothesis_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "one_sample_hypothesis_config" ADD CONSTRAINT "one_sample_hypothesis_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paired_sample_hypothesis_config" ADD CONSTRAINT "paired_sample_hypothesis_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paired_sample_hypothesis_config" ADD CONSTRAINT "paired_sample_hypothesis_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pareto_analysis" ADD CONSTRAINT "pareto_analysis_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pareto_analysis" ADD CONSTRAINT "pareto_analysis_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_capability" ADD CONSTRAINT "process_capability_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_capability" ADD CONSTRAINT "process_capability_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_data" ADD CONSTRAINT "process_data_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_maps" ADD CONSTRAINT "process_maps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_raci_matrix" ADD CONSTRAINT "process_raci_matrix_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_charters" ADD CONSTRAINT "project_charters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_raci_matrix" ADD CONSTRAINT "project_raci_matrix_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_of_improvement_preferences" ADD CONSTRAINT "proof_of_improvement_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_of_improvement_preferences" ADD CONSTRAINT "proof_of_improvement_preferences_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "root_cause_prioritization" ADD CONSTRAINT "root_cause_prioritization_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "root_cause_prioritization" ADD CONSTRAINT "root_cause_prioritization_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simple_regression_config" ADD CONSTRAINT "simple_regression_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sipoc_diagrams" ADD CONSTRAINT "sipoc_diagrams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_design_tracking" ADD CONSTRAINT "solution_design_tracking_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_process_maps" ADD CONSTRAINT "solution_process_maps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_analysis_items" ADD CONSTRAINT "stakeholder_analysis_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_configs" ADD CONSTRAINT "storage_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_proportion_hypothesis_config" ADD CONSTRAINT "two_proportion_hypothesis_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_proportion_hypothesis_config" ADD CONSTRAINT "two_proportion_hypothesis_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_sample_hypothesis_config" ADD CONSTRAINT "two_sample_hypothesis_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_sample_hypothesis_config" ADD CONSTRAINT "two_sample_hypothesis_config_ctq_id_cts_characteristics_id_fk" FOREIGN KEY ("ctq_id") REFERENCES "public"."cts_characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "value_time_analysis" ADD CONSTRAINT "value_time_analysis_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");