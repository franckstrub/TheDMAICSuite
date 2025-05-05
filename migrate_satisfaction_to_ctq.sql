-- Modify customer_requirements table to change satisfaction column from integer to text
ALTER TABLE customer_requirements ALTER COLUMN satisfaction TYPE text;
ALTER TABLE customer_requirements ALTER COLUMN satisfaction SET DEFAULT '';

-- Convert existing satisfaction values to text
UPDATE customer_requirements SET satisfaction = satisfaction::text WHERE satisfaction IS NOT NULL;