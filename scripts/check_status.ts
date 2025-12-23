
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatusValues() {
    console.log('Checking status values in yt_promotions...');
    const { data, error } = await supabase
        .from('yt_promotions')
        .select('status');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const counts: Record<string, number> = {};
    data.forEach(item => {
        const s = item.status || 'NULL';
        counts[s] = (counts[s] || 0) + 1;
    });

    console.log('Status Counts:', counts);
}

checkStatusValues();
