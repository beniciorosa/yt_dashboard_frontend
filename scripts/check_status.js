
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

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

    const counts = {};
    data.forEach(item => {
        const s = item.status || 'NULL';
        counts[s] = (counts[s] || 0) + 1;
    });

    console.log('Status Counts:', JSON.stringify(counts, null, 2));
}

checkStatusValues();
