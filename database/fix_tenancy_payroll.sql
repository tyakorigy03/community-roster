-- Migration to fix multi-tenancy gaps and update payroll RPC

-- 1. Fix Schema Gaps (Add tenant_id to missing staff-related tables)
DO $$
DECLARE
    t_id uuid;
BEGIN
    -- Get default tenant ID
    SELECT id INTO t_id FROM public.tenants WHERE name = 'Blessing Community' LIMIT 1;

    -- Update staff_pay_rates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_pay_rates' AND column_name='tenant_id') THEN
        ALTER TABLE public.staff_pay_rates ADD COLUMN tenant_id uuid;
        UPDATE public.staff_pay_rates SET tenant_id = t_id WHERE tenant_id IS NULL;
        ALTER TABLE public.staff_pay_rates ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE public.staff_pay_rates ADD CONSTRAINT fk_staff_pay_rates_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
        CREATE INDEX IF NOT EXISTS idx_staff_pay_rates_tenant_id ON public.staff_pay_rates(tenant_id);
        RAISE NOTICE 'Added tenant_id to staff_pay_rates';
    END IF;

    -- Update staff_documents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_documents' AND column_name='tenant_id') THEN
        ALTER TABLE public.staff_documents ADD COLUMN tenant_id uuid;
        UPDATE public.staff_documents SET tenant_id = t_id WHERE tenant_id IS NULL;
        ALTER TABLE public.staff_documents ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE public.staff_documents ADD CONSTRAINT fk_staff_documents_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
        CREATE INDEX IF NOT EXISTS idx_staff_documents_tenant_id ON public.staff_documents(tenant_id);
         RAISE NOTICE 'Added tenant_id to staff_documents';
    END IF;

    -- Update staff_shifts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_shifts' AND column_name='tenant_id') THEN
        ALTER TABLE public.staff_shifts ADD COLUMN tenant_id uuid;
        UPDATE public.staff_shifts SET tenant_id = t_id WHERE tenant_id IS NULL;
        ALTER TABLE public.staff_shifts ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE public.staff_shifts ADD CONSTRAINT fk_staff_shifts_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
        CREATE INDEX IF NOT EXISTS idx_staff_shifts_tenant_id ON public.staff_shifts(tenant_id);
         RAISE NOTICE 'Added tenant_id to staff_shifts';
    END IF;
END $$;

-- 2. Redefine Payroll RPC (tenant-aware and junction-table compatible)
-- Drop old 2-argument version
DROP FUNCTION IF EXISTS public.get_staff_pay_summary(date, date);

-- Create new 3-argument version
CREATE OR REPLACE FUNCTION public.get_staff_pay_summary(
    start_date date,
    end_date date,
    p_tenant_id uuid
)
RETURNS TABLE (
    staff_id integer,
    name text,
    profile_picture text,
    role text,
    email text,
    phone text,
    total_hours numeric,
    hourly_rate numeric,
    total_pay numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH staff_hours AS (
        -- Aggregate hours from completed shifts via junction table
        SELECT 
            ssa.staff_id AS s_id,
            SUM(
                EXTRACT(EPOCH FROM (sh.end_time::time - sh.start_time::time)) / 3600.0 
                - COALESCE(sh.break_minutes, 0) / 60.0
            ) AS hours
        FROM public.shift_staff_assignments ssa
        JOIN public.shifts sh ON ssa.shift_id = sh.id
        WHERE sh.shift_date >= start_date 
          AND sh.shift_date <= end_date
          AND sh.tenant_id = p_tenant_id
          AND sh.status = 'completed'
        GROUP BY ssa.staff_id
    ),
    staff_rates AS (
        -- Get default pay rate for each staff in this tenant
        SELECT DISTINCT ON (spr.staff_id)
            spr.staff_id,
            pr.hourly_rate
        FROM public.staff_pay_rates spr
        JOIN public.pay_rates pr ON spr.pay_rate_id = pr.id
        WHERE spr.tenant_id = p_tenant_id
          AND spr.is_default = true
          AND pr.is_active = true
        ORDER BY spr.staff_id, spr.priority DESC, spr.effective_from DESC
    )
    SELECT 
        s.id,
        s.name::text,
        s.profile_picture::text,
        s.role::text,
        s.email::text,
        s.phone::text,
        COALESCE(sh.hours, 0)::numeric AS total_hours,
        COALESCE(sr.hourly_rate, 0)::numeric AS hourly_rate,
        (COALESCE(sh.hours, 0) * COALESCE(sr.hourly_rate, 0))::numeric AS total_pay
    FROM public.staff s
    LEFT JOIN staff_hours sh ON s.id = sh.s_id
    LEFT JOIN staff_rates sr ON s.id = sr.staff_id
    WHERE s.tenant_id = p_tenant_id
      AND s.is_active = true;
END;
$$ LANGUAGE plpgsql;
