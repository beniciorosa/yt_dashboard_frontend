
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
        if (match) {
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[match[1].trim()] = value;
        }
    }
    return env;
}

const env = getEnv();
const supabaseUrl = env['VITE_SUPABASE_URL'] || 'https://qytuhvqggsleohxndtqz.supabase.co';
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dHVodnFnZ3NsZW9oeG5kdHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDgyMTUsImV4cCI6MjA3OTI4NDIxNX0.IBuSVE4yYKLFvx6pXkNDt1132p7d3wTJN4lE_FsBH84';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('Fetching records for "2 nichos"...');
    const { data: records, error } = await supabase
        .from('yt_promotions')
        .select('*')
        .ilike('titulo', '%2 nichos%')
        .order('data_coleta', { ascending: false });

    if (error) return console.error(error);

    console.log(`Found ${records.length} records.`);

    // Group by normalized title
    function normalizeTitle(title) {
        if (!title) return '';
        let normalized = title.trim().toLowerCase();

        // 1. Remove trailing dates in PT-BR (e.g., "27 de nov. de 2025")
        normalized = normalized.replace(/\s+\d{1,2}\s+de\s+[a-zç\.]+\s+de\s+\d{4}.*$/, '');

        // 2. Remove trailing status words if they appear as metadata in title
        normalized = normalized.replace(/\s+(encerrou|pausada|ativa|active|ended|paused).*$/, '');

        // 3. New FIX: Remove everything starting from typical YouTube warning keywords (Reprovada, Declarações, etc.)
        normalized = normalized.split(/reprovada\s+"reprovada"|declarações\s+não\s+confiáveis/i)[0];

        // 4. Remove non-alphanumeric at the end and collapse spaces
        return normalized
            .replace(/[^a-z0-9áàâãéèêíïóôõöúçñ\(\)]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    const grouped = {};
    records.forEach(r => {
        const norm = normalizeTitle(r.titulo);
        if (!grouped[norm]) grouped[norm] = [];
        grouped[norm].push({
            id: r.id,
            titulo: r.titulo,
            status: r.status,
            data_coleta: r.data_coleta,
            custo: r.custo
        });
    });

    console.log('Grouped Results written to diag_results.json');
    fs.writeFileSync('diag_results.json', JSON.stringify(grouped, null, 2));
}

diagnose();
