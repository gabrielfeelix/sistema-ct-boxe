// ─── Aluno ─────────────────────────────────────────────────────────────────
export type AlunoStatus = 'ativo' | 'inativo' | 'bloqueado' | 'cancelado'

export interface Aluno {
    id: string
    nome: string
    email: string
    telefone: string
    cpf?: string
    data_nascimento?: string
    foto_url?: string
    status: AlunoStatus
    observacoes?: string
    data_cadastro: string
    ultimo_treino?: string
    total_treinos: number
    sequencia_atual: number
    contrato_id?: string
    created_at: string
    updated_at: string
}


// ─── Contrato ──────────────────────────────────────────────────────────────
export type ContratoStatus = 'ativo' | 'vencendo' | 'vencido' | 'cancelado' | 'bloqueado'
export type TipoPlano = 'mensal' | 'trimestral' | 'semestral' | 'anual'
export type StatusPagamento = 'pago' | 'pendente' | 'vencido' | 'cancelado'

export interface Plano {
    id: string
    nome: string
    tipo: TipoPlano
    valor: number
    descricao?: string
    ativo: boolean
}

export interface Contrato {
    id: string
    aluno_id: string
    aluno?: Aluno
    plano_id: string
    plano?: Plano
    status: ContratoStatus
    data_inicio: string
    data_fim: string
    valor: number
    dias_para_vencer?: number
    renovacao_automatica: boolean
    created_at: string
    updated_at: string
}

// ─── Aula ──────────────────────────────────────────────────────────────────
export type TipoAula = 'tecnico' | 'condicionamento' | 'sparring' | 'interclasse' | 'livre'
export type StatusAula = 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'

export interface Aula {
    id: string
    nome: string
    tipo: TipoAula
    status: StatusAula
    data: string
    horario_inicio: string
    horario_fim?: string
    vagas_total: number
    vagas_ocupadas: number
    professor: string
    descricao?: string
    created_at: string
}

// ─── Presença ──────────────────────────────────────────────────────────────
export type StatusPresenca = 'confirmado' | 'falta' | 'cancelado'

export interface Presenca {
    id: string
    aluno_id: string
    aluno?: Aluno
    aula_id: string
    aula?: Aula
    status: StatusPresenca
    hora_checkin?: string
    created_at: string
}

// ─── Financeiro ────────────────────────────────────────────────────────────
export type TipoLancamento = 'entrada' | 'saida'
export type MetodoPagamento = 'pix' | 'boleto' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'

export interface Pagamento {
    id: string
    aluno_id: string
    aluno?: Aluno
    contrato_id?: string
    valor: number
    status: StatusPagamento
    metodo?: MetodoPagamento
    data_vencimento: string
    data_pagamento?: string
    mercadopago_id?: string
    qr_code?: string
    created_at: string
}

export interface LancamentoFinanceiro {
    id: string
    descricao: string
    tipo: TipoLancamento
    valor: number
    data: string
    categoria: string
    created_at: string
}

// ─── Feed ──────────────────────────────────────────────────────────────────
export interface PostFeed {
    id: string
    autor_id: string
    autor_nome: string
    autor_iniciais: string
    texto: string
    imagem_url?: string
    curtidas: number
    total_comentarios: number
    created_at: string
}

export interface Comentario {
    id: string
    post_id: string
    autor_id: string
    autor_nome: string
    texto: string
    created_at: string
}

// ─── Story ─────────────────────────────────────────────────────────────────
export interface StoryMediaItem {
    id: string
    autor_id: string
    autor_nome: string
    autor_iniciais: string
    titulo?: string
    midia_url: string
    tipo_midia: 'imagem' | 'video'
    duracao_segundos: number
    visualizacoes: number
    expira_em: string
    created_at: string
}

// ─── Notificação ───────────────────────────────────────────────────────────
export type TipoNotificacao = 'aula' | 'pagamento' | 'ct' | 'sistema' | 'video' | 'evento'
export type AudienciaNotificacao = 'aluno' | 'gestao' | 'professor'

export interface Notificacao {
    id: string
    titulo: string
    subtitulo?: string | null
    mensagem?: string | null
    tipo: TipoNotificacao
    lida: boolean
    aluno_id?: string
    acao?: string | null
    link?: string
    audiencia?: AudienciaNotificacao | null
    professor_nome?: string | null
    icone?: string | null
    created_at: string
    updated_at?: string
}

// ─── Usuário Admin ─────────────────────────────────────────────────────────
export type RoleAdmin = 'super_admin' | 'admin' | 'professor'

export interface UsuarioAdmin {
    id: string
    email: string
    nome: string
    role: RoleAdmin
    foto_url?: string
    created_at: string
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export interface MetricasDashboard {
    total_alunos_ativos: number
    novos_alunos_mes: number
    receita_mes: number
    receita_prevista: number
    total_inadimplentes: number
    valor_inadimplencia: number
    taxa_presenca_semana: number
    aulas_hoje: number
}

// ─── Plano (detalhado) ─────────────────────────────────────────────────────
export interface PlanoCompleto {
    id: string
    nome: string
    tipo: TipoPlano
    valor: number
    descricao?: string
    ativo: boolean
    created_at: string
    // Novos campos para renovação automática
    recorrencia_automatica?: boolean
    tipo_acesso?: 'grupo' | 'individual'
    mercadopago_plan_id?: string | null
}

// ─── Categorização de Aulas ────────────────────────────────────────────────
export type CategoriaAula = 'infantil' | 'adulto' | 'todos'
export type TipoAulaAcesso = 'grupo' | 'individual'

// ─── Série de Aulas Recorrentes ────────────────────────────────────────────
export interface SerieAula {
    id: string
    titulo: string
    dia_semana: number // 0=domingo, 1=segunda, ..., 6=sábado
    hora_inicio: string
    hora_fim: string
    categoria: CategoriaAula
    tipo_aula: TipoAulaAcesso
    professor: string
    capacidade_maxima: number
    ativo: boolean
    data_inicio: string
    data_fim: string | null
    created_at: string
    updated_at: string
}

// ─── Contrato completo (com joins) ────────────────────────────────────────
export interface ContratoCompleto {
    id: string
    aluno_id: string
    plano_id: string
    status: ContratoStatus
    data_inicio: string
    data_fim: string
    valor: number
    renovacao_automatica: boolean
    observacoes?: string
    dias_para_vencer: number
    aluno_nome: string
    aluno_email: string
    aluno_telefone?: string
    aluno_foto?: string
    aluno_status: string
    plano_nome: string
    plano_tipo: TipoPlano
    created_at: string
    updated_at: string
}

// ─── Pagamento completo (com join de aluno) ───────────────────────────────
export interface PagamentoCompleto extends Omit<Pagamento, 'aluno' | 'contrato'> {
    aluno?: {
        nome: string
        email: string
        telefone?: string
    }
    contrato?: {
        plano_nome: string
    }
}

// ─── Fase 6: Candidatos, Feed e Stories ──────────────────────────────────
export interface Candidato {
    id: string
    nome: string
    email: string
    telefone?: string
    data_nascimento?: string
    experiencia_previa?: string
    motivacao?: string
    como_conheceu?: string
    disponibilidade?: string
    tem_condicao_medica: boolean
    descricao_condicao?: string
    status: 'aguardando' | 'aprovado' | 'reprovado'
    observacoes_internas?: string
    motivo_reprovacao?: string
    data_decisao?: string
    aluno_id?: string
    created_at: string
    updated_at: string
}

export interface Post {
    id: string
    conteudo: string
    imagem_url?: string
    autor: string
    total_curtidas: number
    total_comentarios: number
    publicado: boolean
    created_at: string
    updated_at: string
}

export interface Story {
    id: string
    nome: string
    capa_url?: string | null
    total_videos: number
    ativo: boolean
    created_at: string
}

// ─── Avaliação física ─────────────────────────────────────────────────────
export interface Avaliacao {
    id: string
    aluno_id?: string
    candidato_id?: string
    tipo: 'entrada' | 'progresso' | 'saida'
    status: 'agendada' | 'concluida' | 'cancelada'
    data_avaliacao?: string
    avaliador: string
    // Antropométrico
    peso_kg?: number
    altura_cm?: number
    imc?: number
    bf_percentual?: number
    massa_muscular_kg?: number
    // Medidas
    med_peito?: number
    med_cintura?: number
    med_quadril?: number
    med_braco_d?: number
    med_braco_e?: number
    med_coxa_d?: number
    med_coxa_e?: number
    // Testes
    test_flexao_30s?: number
    test_burpee_1min?: number
    test_cooper_metros?: number
    test_pular_corda_min?: number
    // Técnica (0–5)
    tec_postura?: number
    tec_jab?: number
    tec_direto?: number
    tec_gancho?: number
    tec_uppercut?: number
    tec_defesa?: number
    tec_footwork?: number
    nota_tecnica_geral?: number
    // Resultado
    resultado?: 'aprovado' | 'aprovado_condicional' | 'reprovado' | 'pendente'
    observacoes?: string
    proximos_passos?: string
    created_at: string
    updated_at: string
}

export interface AvaliacaoComProgresso extends Avaliacao {
    aluno_nome: string
    aluno_email: string
    peso_inicial?: number
    bf_inicial?: number
    numero_avaliacao: number
}
