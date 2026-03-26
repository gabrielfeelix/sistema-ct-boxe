import { formatDate } from '@/lib/utils/formatters'
import type { PlanoCompleto } from '@/types'

export const CONTRATO_PADRAO_SLUG = 'contrato-padrao'

export const CONTRATO_PADRAO_TITULO = 'Contrato de Prestacao de Servicos CT de Boxe'

export const CONTRATO_PADRAO_CONTEUDO = `CONTRATO DE PRESTACAO DE SERVICOS DE TREINAMENTO

CONTRATANTE: {{aluno_nome}}
E-mail: {{aluno_email}}
CPF: {{aluno_cpf}}
Telefone: {{aluno_telefone}}

CONTRATADA: {{ct_nome}}

1. OBJETO
O presente contrato regula a prestacao de servicos de treinamento esportivo vinculados ao plano {{plano_nome}}, modalidade {{plano_tipo}}.

2. VIGENCIA
Este contrato tem vigencia de {{data_inicio}} ate {{data_fim}}.

3. VALOR
O valor contratado e de {{valor}}, conforme o plano selecionado.

4. RENOVACAO
Renovacao automatica: {{renovacao_automatica}}.

5. CONDICOES GERAIS
O contratante declara estar apto para a pratica esportiva e compromete-se a respeitar as orientacoes tecnicas, regras internas e politicas de uso do CT.

6. ASSINATURA DIGITAL
Este documento sera disponibilizado no app do aluno para leitura e assinatura.

Emitido em {{data_emissao}}.
`

export interface ContratoTemplateContext {
    aluno_nome: string
    aluno_email: string
    aluno_cpf: string
    aluno_telefone: string
    plano_nome: string
    plano_tipo: string
    valor: string
    data_inicio: string
    data_fim: string
    renovacao_automatica: string
    ct_nome: string
    data_emissao: string
}

export const CONTRATO_TEMPLATE_FIELDS: Array<{ token: keyof ContratoTemplateContext; label: string; description: string }> = [
    { token: 'aluno_nome', label: 'Aluno', description: 'Nome completo do aluno selecionado.' },
    { token: 'aluno_email', label: 'E-mail', description: 'E-mail do aluno usado no cadastro.' },
    { token: 'aluno_cpf', label: 'CPF', description: 'CPF informado na ficha do aluno.' },
    { token: 'aluno_telefone', label: 'Telefone', description: 'Telefone principal do aluno.' },
    { token: 'plano_nome', label: 'Plano', description: 'Nome do plano vinculado ao contrato.' },
    { token: 'plano_tipo', label: 'Tipo do plano', description: 'Periodicidade do plano, por exemplo mensal.' },
    { token: 'valor', label: 'Valor', description: 'Valor formatado em reais.' },
    { token: 'data_inicio', label: 'Inicio', description: 'Data inicial da vigencia.' },
    { token: 'data_fim', label: 'Fim', description: 'Data final prevista da vigencia.' },
    { token: 'renovacao_automatica', label: 'Renovacao', description: 'Se o contrato renova automaticamente.' },
    { token: 'ct_nome', label: 'Nome do CT', description: 'Nome fixo da operacao exibido no contrato.' },
    { token: 'data_emissao', label: 'Emissao', description: 'Data de emissao do documento.' },
]

function normalizePlanoTipo(tipo: PlanoCompleto['tipo']) {
    const labels: Record<PlanoCompleto['tipo'], string> = {
        mensal: 'Mensal',
        trimestral: 'Trimestral',
        semestral: 'Semestral',
        anual: 'Anual',
    }

    return labels[tipo] ?? 'Mensal'
}

function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function buildContratoTemplateContext(input: {
    aluno: {
        nome: string
        email?: string | null
        cpf?: string | null
        telefone?: string | null
    }
    plano: PlanoCompleto
    dataInicio: string
    dataFim: string
    renovacaoAutomatica: boolean
    dataEmissao?: Date
}) {
    const emissao = input.dataEmissao ?? new Date()

    return {
        aluno_nome: input.aluno.nome,
        aluno_email: input.aluno.email?.trim() || 'Nao informado',
        aluno_cpf: input.aluno.cpf?.trim() || 'Nao informado',
        aluno_telefone: input.aluno.telefone?.trim() || 'Nao informado',
        plano_nome: input.plano.nome,
        plano_tipo: normalizePlanoTipo(input.plano.tipo),
        valor: formatCurrency(input.plano.valor),
        data_inicio: formatDate(input.dataInicio),
        data_fim: formatDate(input.dataFim),
        renovacao_automatica: input.renovacaoAutomatica ? 'Sim' : 'Nao',
        ct_nome: 'CT de Boxe - Argel Riboli',
        data_emissao: formatDate(emissao),
    } satisfies ContratoTemplateContext
}

export function buildContratoPreviewContext() {
    return {
        aluno_nome: 'Gabriel Felix',
        aluno_email: 'gabriel@example.com',
        aluno_cpf: '123.456.789-10',
        aluno_telefone: '(41) 99999-0000',
        plano_nome: 'Plano Black Belt',
        plano_tipo: 'Mensal',
        valor: 'R$ 195,90',
        data_inicio: '25/03/2026',
        data_fim: '24/04/2026',
        renovacao_automatica: 'Nao',
        ct_nome: 'CT de Boxe - Argel Riboli',
        data_emissao: '25/03/2026',
    } satisfies ContratoTemplateContext
}

export function renderContractTemplate(
    content: string,
    context: Partial<ContratoTemplateContext>
) {
    return content.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, rawToken: string) => {
        const token = rawToken.trim() as keyof ContratoTemplateContext
        return context[token] ?? `{{${rawToken}}}`
    })
}
