export type ContractAppStatus = 'em_dia' | 'vencendo' | 'vencido'

export interface AlunoProfile {
    id: string
    nome: string
    email: string
    telefone?: string | null
    cpf?: string | null
    data_nascimento?: string | null
    status?: string | null
    foto_url?: string | null
}

export interface ContractBannerStatus {
    status: ContractAppStatus
    data_vencimento?: string | null
    dias_para_vencer?: number
    valor?: number | null
    plano?: string | null
}

export interface HomeStory {
    id: string
    nome: string
    capa_url: string | null
    tem_novo: boolean
    total_videos: number
    created_at?: string | null
    videos: HomeStoryVideo[]
}

export interface HomeStoryVideo {
    id: string
    titulo: string
    descricao?: string | null
    video_url: string
    thumbnail: string | null
    duracao: number
    created_at?: string | null
}

export interface HomeNotification {
    id: string
    tipo: string
    titulo: string
    subtitulo: string
    mensagem?: string | null
    horario: string
    lida: boolean
    acao?: string | null
    link?: string | null
    actionLabel?: string | null
    created_at?: string | null
    icone?: string | null
    audiencia?: string | null
}

export type AulaConfirmationState =
    | 'available'
    | 'booked'
    | 'checked_in'
    | 'too_early'
    | 'too_late'
    | 'full'
    | 'past'

export interface AppAula {
    id: string
    nome: string
    data: string
    dataISO: string
    horario: string
    professor: string
    vagas_total: number
    vagas_ocupadas: number
    status: string
    descricao?: string | null
    agendado?: boolean
    presente?: boolean
    confirmationState?: AulaConfirmationState
    presenceActionEnabled?: boolean
    presenceStatusLabel?: string
    presenceActionLabel?: string
    presenceRestrictionMessage?: string | null
}

export interface FeedComment {
    id: string
    autor: string
    iniciais: string
    texto: string
    data: string
}

export interface FeedPost {
    id: string
    autor: string
    iniciais: string
    data: string
    texto: string
    imagem: string | null
    curtidas: number
    comentarios: FeedComment[]
    likedByMe: boolean
}

export interface EventoApp {
    id: string
    titulo: string
    descricao?: string | null
    data_evento: string
    local?: string | null
    icone?: string | null
    imagem_url?: string | null
    valor?: number | null
    destaque: boolean
    ativo: boolean
    confirmados: number
    status_usuario: 'confirmado' | 'pendente'
}

export interface DocumentoAluno {
    id: string
    titulo: string
    status: 'pendente' | 'assinado' | 'expirado' | 'cancelado'
    emitido_em?: string | null
    assinado_em?: string | null
    validade?: string | null
    texto?: string | null
}
