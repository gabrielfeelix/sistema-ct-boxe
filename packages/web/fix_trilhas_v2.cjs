const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
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

-- RLS para Tabelas
ALTER TABLE trilhas_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE trilhas_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trilhas_categorias' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON trilhas_categorias FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Public Access" ON trilhas_videos FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Garantir bucket publico e permissões
-- NOTA: Supabase Storage é gerenciado via storage schema
INSERT INTO storage.buckets (id, name, public)
VALUES ('ct-boxe-media', 'ct-boxe-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access Objects') THEN
        CREATE POLICY "Public Access Objects" ON storage.objects FOR ALL USING (bucket_id = 'ct-boxe-media') WITH CHECK (bucket_id = 'ct-boxe-media');
    END IF;
END $$;
`;

async function main() {
    try {
        await client.connect();
        console.log('Syncing trilhas tables and bucket policy...');
        await client.query(sql);
        console.log('Schema and Bucket policy applied.');

        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'trilhas_videos'");
        console.log('Confirmed Columns in trilhas_videos:', res.rows.map(r => r.column_name).join(', '));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

main();
