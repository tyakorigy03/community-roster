-- ===========================================================================
-- DEMO TENANT SEED SCRIPT
-- Purpose: Create a complete "Demo Organization" tenant with realistic data
--          for Apple App Store / Google Play review processes.
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire script and click Run
--   3. After success, create Auth users using the Edge Function (see below)
--
-- DEMO LOGIN CREDENTIALS (after Auth user creation):
--   Admin:   demo.admin@example.com      / DemoAccess2026
--   Staff 1: sarah.mitchell@example.com  / DemoAccess2026
--   Staff 2: james.walker@example.com    / DemoAccess2026
-- ===========================================================================

DO $$
DECLARE
    -- Tenant
    demo_tenant_id      uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    -- Hierarchy
    h_program_id        uuid := 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    h_house_a_id        uuid := 'c3d4e5f6-a7b8-9012-cdef-123456789012';

    -- Shift Types (global shared, no tenant_id)
    st_daily_id         uuid;
    st_active_id        uuid;
    st_community_id     uuid;

    -- Staff
    admin_staff_id      integer;
    staff2_id           integer;
    staff3_id           integer;

    -- Clients
    client1_id          uuid := 'd4e5f6a7-b8c9-0123-defa-234567890123';
    client2_id          uuid := 'e5f6a7b8-c9d0-1234-efab-345678901234';
    client3_id          uuid := 'f6a7b8c9-d0e1-2345-fabc-456789012345';

    -- Shifts
    shift1_id           uuid := 'a7b8c9d0-e1f2-3456-abcd-567890123456';
    shift2_id           uuid := 'b8c9d0e1-f2a3-4567-bcde-678901234567';
    shift3_id           uuid := 'c9d0e1f2-a3b4-5678-cdef-789012345678';
    shift4_id           uuid := 'd0e1f2a3-b4c5-6789-defa-890123456789';

    -- Progress Notes
    pnote1_id           uuid := 'f2a3b4c5-d6e7-8901-fabc-012345678901';
    pnote2_id           uuid := 'a3b4c5d6-e7f8-9012-abcd-123456789012';

    -- Incidents
    incident1_id        uuid := 'e1f2a3b4-c5d6-7890-efab-901234567890';

BEGIN

-- ===========================================================================
-- 1. TENANT
-- ===========================================================================
INSERT INTO public.tenants (id, name, is_active)
VALUES (demo_tenant_id, 'Demo Organization', true)
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE 'Tenant created: %', demo_tenant_id;

-- ===========================================================================
-- 2. HIERARCHY (Location/Program structure)
-- ===========================================================================
INSERT INTO public.hierarchy (id, name, code, description, parent_id, is_active, sort_order, tenant_id)
VALUES
    (h_program_id, 'NDIS Support Program', 'PROG-01', 'Primary NDIS support delivery program', NULL, true, 1, demo_tenant_id),
    (h_house_a_id, 'Group Home Alpha', 'GH-A', 'Main group home location - 12 Oak Street', h_program_id, true, 2, demo_tenant_id)
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- 3. STAFF (Admin + 2 Support Workers)
--    NOTE: Auth accounts must be created separately via Edge Function
--          or Supabase Dashboard → Authentication → Users → Add User
-- ===========================================================================
INSERT INTO public.staff (name, dob, phone, email, address, is_active, role, tenant_id)
VALUES ('Demo Admin', '1985-06-15', '0412 000 001', 'demo.admin@example.com', '1 Admin Street, Melbourne VIC 3000', true, 'admin', demo_tenant_id)
RETURNING id INTO admin_staff_id;

INSERT INTO public.staff (name, dob, phone, email, address, is_active, role, tenant_id)
VALUES ('Sarah Mitchell', '1990-03-20', '0412 000 002', 'sarah.mitchell@example.com', '34 Worker Ave, Melbourne VIC 3001', true, 'staff', demo_tenant_id)
RETURNING id INTO staff2_id;

INSERT INTO public.staff (name, dob, phone, email, address, is_active, role, tenant_id)
VALUES ('James Walker', '1993-11-08', '0412 000 003', 'james.walker@example.com', '89 Support Rd, Brunswick VIC 3056', true, 'staff', demo_tenant_id)
RETURNING id INTO staff3_id;

RAISE NOTICE 'Staff IDs: Admin=%, Sarah=%, James=%', admin_staff_id, staff2_id, staff3_id;

-- ===========================================================================
-- 4. CLIENTS (3 realistic NDIS participants)
-- ===========================================================================
INSERT INTO public.clients (
    id, first_name, last_name, date_of_birth, phone_number, email,
    address_line, city, state, postcode, ndis_number, diagnosis,
    goals_summary, doctor_name, doctor_phone,
    next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
    is_active, tenant_id
)
VALUES
    (
        client1_id, 'Oliver', 'Thompson', '1975-04-12', '0411 100 001',
        'oliver.thompson@demomail.com', '12 Oak Street', 'Melbourne', 'VIC', '3000',
        'NDIS9990000001', 'Autism Spectrum Disorder (Level 2)',
        'Improve community engagement and daily living skills. Develop independent meal preparation. Increase positive social interactions.',
        'Dr. Rebecca Chang', '(03) 9000 1001',
        'Margaret Thompson', '0411 200 001', 'Mother',
        true, demo_tenant_id
    ),
    (
        client2_id, 'Amelia', 'Roberts', '1988-09-25', '0411 100 002',
        'amelia.roberts@demomail.com', '45 River Lane', 'Brunswick', 'VIC', '3056',
        'NDIS9990000002', 'Intellectual Disability',
        'Strengthen independent travel skills. Develop budgeting and financial literacy. Enhance vocational readiness.',
        'Dr. Paul Nguyen', '(03) 9000 1002',
        'David Roberts', '0411 200 002', 'Father',
        true, demo_tenant_id
    ),
    (
        client3_id, 'Liam', 'Chen', '1995-02-18', '0411 100 003',
        'liam.chen@demomail.com', '78 Garden Path', 'Fitzroy', 'VIC', '3065',
        'NDIS9990000003', 'Cerebral Palsy',
        'Increase community participation. Develop communication strategies. Maintain health and wellbeing routines.',
        'Dr. Susan Park', '(03) 9000 1003',
        'Jennifer Chen', '0411 200 003', 'Sister',
        true, demo_tenant_id
    )
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- 5. SHIFT TYPES (Global table — insert if not already present)
-- ===========================================================================
INSERT INTO public.shift_types (name, description, is_active, sort_order)
VALUES
    ('Daily Activities', 'Support with daily living activities', true, 1),
    ('Active Community Participation', 'Community participation and social activities', true, 2),
    ('Group Activities', 'Group-based support activities', true, 3)
ON CONFLICT (name) DO NOTHING;

SELECT id INTO st_daily_id FROM public.shift_types WHERE name = 'Daily Activities' LIMIT 1;
SELECT id INTO st_active_id FROM public.shift_types WHERE name = 'Active Community Participation' LIMIT 1;
SELECT id INTO st_community_id FROM public.shift_types WHERE name = 'Group Activities' LIMIT 1;

-- ===========================================================================
-- 6. SHIFTS (Past + upcoming for the current week)
-- ===========================================================================
INSERT INTO public.shifts (id, client_id, staff_id, shift_date, start_time, end_time, break_minutes, shift_type_id, status, is_active, created_by, tenant_id)
VALUES
    -- Upcoming shifts (so reviewer can see the calendar/roster)
    (shift1_id, client1_id, admin_staff_id, CURRENT_DATE + 1, '09:00', '15:00', 30, st_daily_id,     'scheduled',  true, admin_staff_id, demo_tenant_id),
    (shift2_id, client2_id, staff2_id,      CURRENT_DATE + 1, '10:00', '14:00',  0, st_active_id,   'scheduled',  true, admin_staff_id, demo_tenant_id),
    (shift3_id, client3_id, staff3_id,      CURRENT_DATE + 2, '09:00', '12:00',  0, st_community_id,'scheduled',  true, admin_staff_id, demo_tenant_id),
    -- Past completed shift (so progress notes can reference it)
    (shift4_id, client1_id, staff2_id,      CURRENT_DATE - 1, '08:00', '14:00', 30, st_daily_id,     'completed',  true, admin_staff_id, demo_tenant_id)
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- 7. PROGRESS NOTES (2 notes — one linked to shift, one standalone)
-- ===========================================================================
INSERT INTO public.progress_notes (
    id, shift_id, client_id, event_date, hierarchy_id, subject,
    shift_date, shift_start_time, shift_end_time, shift_type_id,
    shift_notes, key_areas, created_by, is_draft, is_submitted, tenant_id
)
VALUES
    (
        pnote1_id,
        shift4_id, client1_id, CURRENT_DATE - 1,
        h_house_a_id, 'Daily Support – Positive Engagement',
        CURRENT_DATE - 1, '08:00', '14:00', st_daily_id,
        'Oliver engaged well throughout the shift today. Assisted with morning hygiene routine and breakfast preparation. Oliver successfully made his own toast and scrambled eggs with minimal prompting. Attended group activities in the afternoon and interacted positively with two peers. He remained calm and focused throughout the day. No incidents occurred during this shift.',
        '["Personal Hygiene", "Meal Preparation", "Social Interaction"]'::jsonb,
        admin_staff_id, false, true, demo_tenant_id
    ),
    (
        pnote2_id,
        NULL, client2_id, CURRENT_DATE - 3,
        h_program_id, 'Community Participation – Library Visit',
        CURRENT_DATE - 3, '10:00', '13:00', st_active_id,
        'Amelia participated in the weekly community outing to the local library today. She independently selected three books with minimal support and practiced using the self-checkout machine. Amelia demonstrated excellent travel training skills using public transport to and from the venue. She expressed enthusiasm about joining the next community outing.',
        '["Community Access", "Independent Travel", "Communication Skills"]'::jsonb,
        staff2_id, false, true, demo_tenant_id
    )
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- 8. INCIDENTS (1 realistic low-severity incident)
-- ===========================================================================
INSERT INTO public.incidents (
    id, client_id, event_date, hierarchy_id, subject,
    incident_date, incident_time, location, witnesses,
    incident_summary, incident_description, deescalation_outcome,
    incident_rating, follow_up_required, management_contacted,
    created_by, tenant_id
)
VALUES
    (
        incident1_id,
        client1_id, CURRENT_DATE - 5,
        h_house_a_id, 'Verbal Distress – Transition Difficulty',
        CURRENT_DATE - 5, '14:30',
        'Group Home Alpha – Living Room',
        'Staff Member: Sarah Mitchell',
        'Oliver became verbally distressed when the afternoon activity was changed at short notice due to rain.',
        'During the afternoon session, the planned outing to the park was cancelled due to light rain. When informed of the change, Oliver raised his voice and repeated "I want to go park" multiple times. Staff provided calm verbal reassurance and offered an alternative indoor activity (painting). Oliver gradually de-escalated over approximately 10 minutes and engaged in painting for the remainder of the session.',
        'Situation resolved through verbal de-escalation. Oliver was successfully redirected to an alternative indoor activity and remained calm for the rest of the shift. No physical intervention was required.',
        'Low', 'Yes', 'Yes',
        admin_staff_id, demo_tenant_id
    )
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- 9. PAY RATES (Demo tenant specific, prefixed to avoid conflicts)
-- ===========================================================================
INSERT INTO public.pay_rates (name, description, hourly_rate, day_type, is_active, created_by, tenant_id)
VALUES
    ('Standard Weekday', 'Standard NDIS support worker weekday rate', 38.50, 'weekday', true, admin_staff_id, demo_tenant_id),
    ('Saturday Rate',    'Saturday support worker rate',               54.00, 'saturday', true, admin_staff_id, demo_tenant_id),
    ('Sunday Rate',      'Sunday support worker rate',                 70.50, 'sunday',   true, admin_staff_id, demo_tenant_id)
;

-- ===========================================================================
-- 10. SETTINGS (Use prefixed keys to avoid global unique constraint collision)
-- ===========================================================================
INSERT INTO public.settings (key, name, description, enabled, tenant_id)
VALUES
    ('demo_clock_in_out',       'Clock In/Out',        'Enable staff clock-in/out functionality',    true, demo_tenant_id),
    ('demo_incident_reporting', 'Incident Reporting',  'Enable incident reporting workflow',          true, demo_tenant_id),
    ('demo_progress_notes',     'Progress Notes',      'Enable progress note management',             true, demo_tenant_id),
    ('demo_roster_publishing',  'Roster Publishing',   'Enable publishing roster to staff via email', true, demo_tenant_id)
ON CONFLICT (key) DO NOTHING;

RAISE NOTICE '======================================================';
RAISE NOTICE 'DEMO TENANT SEED COMPLETE';
RAISE NOTICE '======================================================';
RAISE NOTICE 'Tenant ID: %', demo_tenant_id;
RAISE NOTICE 'Next step: Create auth users for these 3 emails via';
RAISE NOTICE 'Supabase Dashboard > Auth > Users > Add User, then';
RAISE NOTICE 'call create_user edge function to link them to staff.';
RAISE NOTICE '======================================================';

END $$;
