-- Add new FTE parameter columns to the project_charters table
ALTER TABLE project_charters 
ADD COLUMN fte_working_days_per_year TEXT,
ADD COLUMN fte_working_hours_per_day TEXT, 
ADD COLUMN fte_time_unit TEXT,
ADD COLUMN fte_saved_hours TEXT,
ADD COLUMN fte_cost_per_year TEXT,
ADD COLUMN fte_calculated_value TEXT;