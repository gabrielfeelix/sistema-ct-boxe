const { Client } = require('pg');
require('dotenv').config({ path: './.env.local' });

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
});

const sql = `
CREATE TABLE IF NOT EXISTS trilhas_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trilhas_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    categoria_id UUID REFERENCES trilhas_categorias(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE trilhas_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE trilhas_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trilhas_categorias' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON trilhas_categorias FOR ALL USING (true);
        CREATE POLICY "Public Access" ON trilhas_videos FOR ALL USING (true);
    END IF;
END $$;
`;

async function main() {
    try {
        await client.connect();
        console.log('Syncing trilhas tables...');
        await client.query(sql);
        console.log('Success!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

main();
