import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lyuhhztaemndephpgjaj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dWhoenRhZW1uZGVwaHBnamFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg5MzUwMSwiZXhwIjoyMDgxNDY5NTAxfQ.PEKioArO5fS6U1cTk1HEvatwTWrJWPHoea76SNizvhw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verifyPayroll() {
    console.log('--- Verifying Payroll RPC ---');
    
    // 1. Get a tenant ID for testing
    const { data: tenants, error: tenantError } = await supabase.from('tenants').select('id, name').limit(1);
    if (tenantError) {
        console.error('Error fetching tenants:', tenantError);
        return;
    }
    const tenantId = tenants[0].id;
    console.log(`Using Tenant: ${tenants[0].name} (${tenantId})`);

    // 2. Call the new RPC
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.rpc('get_staff_pay_summary', {
        start_date: '2020-01-01', // Wide range to catch seed data
        end_date: today,
        p_tenant_id: tenantId
    });

    if (error) {
        console.error('RPC Error:', error);
    } else {
        console.log(`Success! Found ${data.length} staff records.`);
        if (data.length > 0) {
            console.log('Sample Record:', JSON.stringify(data[0], null, 2));
        }
    }
}

verifyPayroll();
