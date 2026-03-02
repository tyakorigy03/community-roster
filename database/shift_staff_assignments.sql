-- Junction table for many-to-many relationship between shifts and staff
-- This allows multiple staff members to be assigned to a single shift

CREATE TABLE IF NOT EXISTS shift_staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id, staff_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shift_staff_shift ON shift_staff_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_staff_staff ON shift_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_shift_staff_assigned_at ON shift_staff_assignments(assigned_at);

-- Enable Row Level Security
ALTER TABLE shift_staff_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your existing auth setup)
CREATE POLICY "Enable read access for authenticated users" ON shift_staff_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON shift_staff_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON shift_staff_assignments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON shift_staff_assignments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shift_staff_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shift_staff_assignments_timestamp
  BEFORE UPDATE ON shift_staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_staff_assignments_updated_at();

-- Migration: Populate from existing shifts with staff_id
-- This preserves existing single-staff assignments
INSERT INTO shift_staff_assignments (shift_id, staff_id, assigned_at)
SELECT id, staff_id, created_at
FROM shifts
WHERE staff_id IS NOT NULL
ON CONFLICT (shift_id, staff_id) DO NOTHING;

-- Comment explaining the table
COMMENT ON TABLE shift_staff_assignments IS 'Junction table linking shifts to multiple staff members, enabling multi-staff assignment per shift';
