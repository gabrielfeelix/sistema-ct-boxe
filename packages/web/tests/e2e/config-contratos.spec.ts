import { expect, test } from '@playwright/test'
import {
    cleanupAlunoByEmail,
    cleanupContratoModelosByPrefix,
    cleanupPlanosByPrefix,
    findContratoModeloByTitle,
    findPendingDocumentoByAlunoEmail,
    seedAluno,
    seedPlano,
    uniqueTag,
} from './helpers'

test('creates a new contract template version and emits the shared student document', async ({ page }) => {
    const prefix = uniqueTag('E2E Contrato')
    const titulo = `${prefix} Modelo Oficial`
    const email = `${prefix.toLowerCase().replace(/\s+/g, '-')}@example.com`
    const nome = `${prefix} Aluno`
    const telefone = '(41) 99999-0011'
    const cpf = '12345678910'
    const nomePlano = `${prefix} Plano`

    let alunoId = ''

    try {
        alunoId = await seedAluno({ nome, email, telefone, cpf })

        await page.goto('/configuracoes/contratos')
        await expect(page.getByRole('heading', { level: 2, name: /^contratos$/i })).toBeVisible()

        await page.getByPlaceholder(/contrato de prestacao de servicos ct de boxe/i).fill(titulo)
        await page.getByPlaceholder(/ajuste da clausula de renovacao/i).fill('Versao de teste criada pela suite E2E.')
        await page.getByPlaceholder('https://...').fill('https://example.com/contrato.pdf')
        await page.getByPlaceholder(/escreva o contrato completo/i).fill(`CONTRATO TESTE ${prefix}

Aluno: {{aluno_nome}}
Plano: {{plano_nome}}
Valor: {{valor}}
Vigencia: {{data_inicio}} ate {{data_fim}}
Renovacao automatica: {{renovacao_automatica}}
Emissao: {{data_emissao}}`)

        await page.getByRole('button', { name: /salvar versao/i }).click()
        await expect(page.getByRole('heading', { name: titulo })).toBeVisible()
        await expect(page.getByText(/versao de teste criada pela suite e2e/i)).toBeVisible()

        const modelo = await findContratoModeloByTitle(titulo)
        expect(modelo?.id).toBeTruthy()
        await seedPlano({
            nome: nomePlano,
            valor: 219.9,
            contrato_modelo_id: modelo!.id,
            recorrencia_intervalo: 2,
            recorrencia_unidade: 'meses',
        })

        await page.goto(`/contratos/novo?aluno_id=${alunoId}`)
        await expect(page.getByRole('heading', { level: 2, name: /registrar contrato/i })).toBeVisible()
        await expect(page.getByText(new RegExp(nome, 'i'))).toBeVisible()

        await page.getByRole('button', { name: new RegExp(nomePlano, 'i') }).click()
        await expect(page.getByText(new RegExp(`CONTRATO TESTE ${prefix}`, 'i'))).toBeVisible()
        await page.getByRole('button', { name: /salvar contrato/i }).click()

        await expect(page).toHaveURL(/\/contratos\/[0-9a-f-]+$/)

        let documento = null
        for (let attempt = 0; attempt < 10; attempt += 1) {
            documento = await findPendingDocumentoByAlunoEmail(email)
            if (documento) break
            await page.waitForTimeout(500)
        }

        expect(documento).not.toBeNull()
        expect(documento?.titulo).toContain(titulo)
        expect(documento?.texto).toContain(nome)
        expect(documento?.texto).toContain('Plano:')
    } finally {
        await cleanupAlunoByEmail(email)
        await cleanupPlanosByPrefix(prefix)
        await cleanupContratoModelosByPrefix(prefix)
    }
})
