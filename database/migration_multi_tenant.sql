-- Migration script for Multi-Tenancy

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

-- 2. Insert initial tenant "Blessing Community"
-- Using a fixed UUID for the first tenant if possible, or just letting it generate.
-- The user mentioned "Tenant 1", but uuid is safer for Supabase/Postgres.
-- I will capture the ID of the inserted tenant.
INSERT INTO public.tenants (name)
VALUES ('Blessing Community')
ON CONFLICT DO NOTHING;

-- 3. Add tenant_id to all relevant tables (NULLABLE initially)
DO $$
DECLARE
    t_id uuid;
    table_name_var text;
    tables_to_update text[] := ARRAY[
        'clients', 'staff', 'shifts', 'incidents', 'progress_notes', 
        'documents', 'hierarchy', 'shift_types', 'incident_types', 
        'emergency_assistance_types', 'pay_rates', 'government_report_emails', 
        'settings', 'roster_publications'
    ];
BEGIN
    -- Get the ID of Blessing Community
    SELECT id INTO t_id FROM public.tenants WHERE name = 'Blessing Community' LIMIT 1;

    FOREACH table_name_var IN ARRAY tables_to_update
    LOOP
        -- Add column if it doesn't exist
        EXECUTE 'ALTER TABLE public.' || table_name_var || ' ADD COLUMN IF NOT EXISTS tenant_id uuid;';
        
        -- Update existing records
        EXECUTE 'UPDATE public.' || table_name_var || ' SET tenant_id = $1 WHERE tenant_id IS NULL;' USING t_id;
        
        -- Set NOT NULL
        EXECUTE 'ALTER TABLE public.' || table_name_var || ' ALTER COLUMN tenant_id SET NOT NULL;';
        
        -- Add Foreign Key
        -- Note: We use dynamic SQL for constraint naming to avoid collisions if script is run multiple times
        BEGIN
            EXECUTE 'ALTER TABLE public.' || table_name_var || 
                    ' ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Constraint already exists for %', table_name_var;
        END;

        -- Add Index
        BEGIN
            EXECUTE 'CREATE INDEX idx_' || table_name_var || '_tenant_id ON public.' || table_name_var || '(tenant_id);';
        EXCEPTION WHEN duplicate_table THEN
            RAISE NOTICE 'Index already exists for %', table_name_var;
        END;
    END LOOP;
END $$;
