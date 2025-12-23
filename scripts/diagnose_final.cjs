
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

const targetSubstrings = [
    "como gerar código universal",
    "como fazer ads no mercado livre",
    "product ads: aprenda calcular"
];

function normalizeTitle(title) {
    if (!title) return '';
    let normalized = title.trim().toLowerCase();
    normalized = normalized.replace(/\s+\d{1,2}\s+de\s+[a-zç\.]+\s+de\s+\d{4}.*$/, '');
    normalized = normalized.replace(/\s+(encerrou|pausada|ativa|active|ended|paused).*$/, '');
    return normalized
        .replace(/[^a-z0-9áàâãéèêíïóôõöúçñ\(\)]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function diagnose() {
    const { data: allData, error } = await supabase.from('yt_promotions').select('*');
    if (error) return console.error(error);

    const check = {};

    targetSubstrings.forEach(substr => {
        const matches = allData.filter(item =>
            item.titulo && item.titulo.toLowerCase().includes(substr.toLowerCase())
        );
        check[substr] = matches.map(m => ({
            id: m.id,
            status: m.status,
            norm: normalizeTitle(m.titulo),
            coleta: m.data_coleta
        }));
    });

    fs.writeFileSync(path.join(__dirname, 'results_final.json'), JSON.stringify(check, null, 2));
    console.log('Results written to results_final.json');
}

diagnose();
