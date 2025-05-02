-- Sync Project Charter values to Project benefits and costs
-- This is a one-time migration to ensure project benefits values match charter values

-- Update all projects with benefits values from project charters
UPDATE projects p
SET benefits = JSONB_BUILD_OBJECT(
  'qualityCostSavings', NULLIF(pc.savings_per_year, '')::numeric, 
  'workingCapitalGains', NULLIF(pc.working_capital_gains, '')::numeric,
  'wacc', NULLIF(pc.wacc_percentage, '')::numeric / 100,
  'fteBenefits', NULLIF(pc.fte_benefits, '')::numeric,
  'avgFTECost', NULLIF(pc.fte_cost_per_year, '')::numeric
)
FROM project_charters pc
WHERE p.id = pc.project_id;

-- Update all projects with cost values from project charters
UPDATE projects p
SET costs = JSONB_BUILD_OBJECT(
  'oneOffPeopleCost', NULLIF(pc.one_off_people_cost, '')::numeric,
  'oneOffTechnologyCost', NULLIF(pc.one_off_technology_cost, '')::numeric,
  'oneOffOtherCost', NULLIF(pc.one_off_other_cost, '')::numeric,
  'capexCost', NULLIF(pc.capex_cost, '')::numeric
)
FROM project_charters pc
WHERE p.id = pc.project_id;

-- Set default values for any project that doesn't have benefits or costs
UPDATE projects
SET benefits = '{"qualityCostSavings": 0, "workingCapitalGains": 0, "wacc": 0.1, "fteBenefits": 0, "avgFTECost": 0}'::jsonb
WHERE benefits IS NULL;

UPDATE projects
SET costs = '{"oneOffPeopleCost": 0, "oneOffTechnologyCost": 0, "oneOffOtherCost": 0, "capexCost": 0}'::jsonb
WHERE costs IS NULL;