import type { PostgrestError } from '@supabase/supabase-js'

import { Alert } from 'react-native'
import { daysUntil, getInitials, monthLabel, toBRDate, toBRDateTime, toBRTime, toISODateLocal } from '@/lib/formatters'
import { supabase } from './supabase'
import type {
    AlunoProfile,
    AppAula,
    AulaConfirmationState,
    ContractBannerStatus,
    DocumentoAluno,
    EventoApp,
    FeedComment,
    FeedPost,
    HomeNotification,
    HomeStory,
    HomeStoryVideo,
} from '@/lib/types'

export interface HomeAviso {
    id: string
    titulo: string
    data: string
    texto: string
}

export interface HomeData {
    stories: HomeStory[]
    notificacoesNaoLidas: number
    avisos: HomeAviso[]
    proximasAulas: AppAula[]
    proximaAula: AppAula | null
}

export interface AgendaDaySummary {
    iso: string
    label: string
    shortLabel: string
    dayNumber: number
    isToday: boolean
    hasClasses: boolean
}

export interface AgendaData {
    selectedDateISO: string
    selectedLabel: string
    dias: AgendaDaySummary[]
    aulas: AppAula[]
    proximaAula: AppAula | null
}

export interface HistoricoData {
    mesLabel: string
    resumo: {
        mes: number
        sequencia: number
        total: number
    }
    diasComPresenca: number[]
    presencasLista: Array<{ id: string; data: string; aula: string }>
}

export interface PerfilData {
    aluno: AlunoProfile | null
    contratoStatus: ContractBannerStatus
    contratosAbertos: DocumentoAluno[]
    contratosAssinados: DocumentoAluno[]
}

export interface FaturaItem {
    id: string
    valor: number
    data_vencimento?: string | null
    data_pagamento?: string | null
    status: string
    metodo?: string | null
    comprovante: boolean
}

export interface PagamentoAtual {
    id: string
    status: string
    valor: number | null
    data_vencimento?: string | null
    qr_code_base64?: string | null
    pix_copia_cola?: string | null
    plano?: string | null
}

export interface AulaDetalhe {
    id: string
    nome: string
    horario: string
    data: string
    dataISO: string
    professor: string
    descricao: string
    vagas_total: number
    vagas_ocupadas: number
    confirmados: string[]
    userStatus: string | null
}

function isMissingTable(error?: PostgrestError | null) {
    return error?.code === '42P01'
}

function mapAula(row: Record<string, unknown>, vagasOcupadas = 0): AppAula {
    const nome = (row.nome as string) ?? (row.titulo as string) ?? 'Treino de Boxe'
    const horarioRaw =
        (row.horario_inicio as string) ??
        (row.hora_inicio as string) ??
        (row.horario as string) ??
        null
    const dataRaw = (row.data as string) ?? (row.data_aula as string) ?? null
    const professor = (row.professor as string) ?? 'Prof. Argel Riboli'
    const vagasTotal =
        Number(row.vagas_total ?? row.capacidade_maxima ?? row.vagas ?? row.maximo_alunos ?? 0) || 0

    return {
        id: String(row.id),
        nome,
        data: dataRaw ? toBRDate(dataRaw) : '-',
        dataISO: dataRaw || '',
        horario: toBRTime(horarioRaw),
        professor,
        vagas_total: vagasTotal,
        vagas_ocupadas: vagasOcupadas,
        status: String(row.status ?? 'agendada'),
        descricao: (row.descricao as string) ?? null,
    }
}

function getTodayISO() {
    return toISODateLocal()
}

function getTomorrowISO() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return toISODateLocal(tomorrow)
}

function buildNextDays(count: number) {
    const labels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
    return Array.from({ length: count }).map((_, index) => {
        const date = new Date()
        date.setDate(date.getDate() + index)
        const iso = toISODateLocal(date)
        return {
            iso,
            date,
            dayNumber: date.getDate(),
            isToday: index === 0,
            shortLabel: index === 0 ? 'HOJE' : index === 1 ? 'AMANHA' : labels[date.getDay()],
            label: toBRDate(date),
        }
    })
}

function mapNotificationActionLabel(tipo: string, acao?: string | null) {
    const normalizedType = tipo.toLowerCase()
    const normalizedAction = (acao ?? '').toLowerCase()

    if (normalizedAction === 'pagamento') return 'Pagar agora'
    if (normalizedAction === 'assistir_video' || normalizedAction === 'stories') return 'Assistir video'
    if (normalizedAction === 'checkin' || normalizedAction === 'evento') return 'Ver detalhes'
    if (normalizedType === 'pagamento') return 'Pagar agora'
    if (normalizedType === 'video') return 'Assistir video'
    if (normalizedType === 'aula') return 'Ver aula'
    return 'Abrir'
}

type NotificationAudience = 'aluno' | 'gestao' | 'professor'

type NotificationInsertPayload = {
    aluno_id?: string | null
    tipo: string
    titulo: string
    subtitulo?: string | null
    mensagem?: string | null
    acao?: string | null
    link?: string | null
    audiencia?: NotificationAudience
    professor_nome?: string | null
    icone?: string | null
}

async function insertNotification(payload: NotificationInsertPayload) {
    const { error } = await supabase.from('notificacoes').insert({
        aluno_id: payload.aluno_id ?? null,
        tipo: payload.tipo,
        titulo: payload.titulo,
        subtitulo: payload.subtitulo ?? null,
        mensagem: payload.mensagem ?? null,
        acao: payload.acao ?? null,
        link: payload.link ?? null,
        audiencia: payload.audiencia ?? 'aluno',
        professor_nome: payload.professor_nome ?? null,
        icone: payload.icone ?? null,
        lida: false,
    })

    if (error) {
        console.error('[Notificacoes] Erro ao inserir notificacao:', error.message)
    }
}

function horaToMinutes(hora: string) {
    if (!hora || !hora.includes(':')) return 0
    const [h, m] = hora.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
}

type AulaConfirmationInfo = {
    state: AulaConfirmationState
    presenceActionEnabled: boolean
    presenceStatusLabel: string
    presenceActionLabel: string
    presenceRestrictionMessage: string | null
}

type AulaConfirmationInput = {
    dataISO: string
    horario: string
    userStatus?: string | null
    vagasTotal: number
    vagasOcupadas: number
}

function buildAulaDateTime(dataISO: string, horario: string) {
    if (!dataISO || !horario || !horario.includes(':')) return null
    const [hour, minute] = horario.split(':').map(Number)
    const [year, month, day] = dataISO.split('-').map(Number)

    if (![year, month, day, hour, minute].every((part) => Number.isFinite(part))) {
        return null
    }

    return new Date(year, month - 1, day, hour, minute, 0, 0)
}

export function getAulaConfirmationInfo({
    dataISO,
    horario,
    userStatus,
    vagasTotal,
    vagasOcupadas,
}: AulaConfirmationInput): AulaConfirmationInfo {
    const isBooked = userStatus === 'agendado' || userStatus === 'confirmado'
    const isCheckedIn = userStatus === 'presente'
    const isFull = vagasTotal > 0 && vagasOcupadas >= vagasTotal && !isBooked && !isCheckedIn
    const aulaDateTime = buildAulaDateTime(dataISO, horario)

    if (!aulaDateTime) {
        return {
            state: 'past',
            presenceActionEnabled: false,
            presenceStatusLabel: 'Indisponivel',
            presenceActionLabel: 'Indisponivel',
            presenceRestrictionMessage: 'Nao foi possivel validar o horario desta aula.',
        }
    }

    const diffMinutes = Math.floor((aulaDateTime.getTime() - Date.now()) / (1000 * 60))

    if (isCheckedIn) {
        return {
            state: 'checked_in',
            presenceActionEnabled: false,
            presenceStatusLabel: 'Check-in',
            presenceActionLabel: 'Check-in realizado',
            presenceRestrictionMessage: null,
        }
    }

    if (isBooked) {
        return {
            state: 'booked',
            presenceActionEnabled: diffMinutes > 0,
            presenceStatusLabel: 'Confirmada',
            presenceActionLabel: diffMinutes > 0 ? 'Cancelar presenca' : 'Aula encerrada',
            presenceRestrictionMessage: diffMinutes > 0 ? null : 'A aula ja foi encerrada.',
        }
    }

    if (diffMinutes <= 0) {
        return {
            state: 'past',
            presenceActionEnabled: false,
            presenceStatusLabel: 'Encerrada',
            presenceActionLabel: 'Aula encerrada',
            presenceRestrictionMessage: 'A aula ja foi encerrada.',
        }
    }

    if (isFull) {
        return {
            state: 'full',
            presenceActionEnabled: false,
            presenceStatusLabel: 'Lotada',
            presenceActionLabel: 'Sem vagas',
            presenceRestrictionMessage: 'Essa turma esta lotada no momento.',
        }
    }

    if (diffMinutes > 24 * 60) {
        return {
            state: 'too_early',
            presenceActionEnabled: false,
            presenceStatusLabel: 'Indisponivel',
            presenceActionLabel: 'Indisponivel',
            presenceRestrictionMessage: 'Voce so pode confirmar uma aula nas 24 horas anteriores.',
        }
    }

    if (diffMinutes <= 30) {
        return {
            state: 'too_late',
            presenceActionEnabled: false,
            presenceStatusLabel: 'Indisponivel',
            presenceActionLabel: 'Indisponivel',
            presenceRestrictionMessage: 'A confirmacao precisa ser feita com pelo menos 30 minutos de antecedencia.',
        }
    }

    return {
        state: 'available',
        presenceActionEnabled: true,
        presenceStatusLabel: 'Disponivel',
        presenceActionLabel: 'Confirmar presenca',
        presenceRestrictionMessage: null,
    }
}

function decorateAulaWithConfirmation(aula: AppAula, userStatus?: string | null): AppAula {
    const confirmation = getAulaConfirmationInfo({
        dataISO: aula.dataISO,
        horario: aula.horario,
        userStatus,
        vagasTotal: aula.vagas_total,
        vagasOcupadas: aula.vagas_ocupadas,
    })

    return {
        ...aula,
        agendado: userStatus === 'agendado' || userStatus === 'confirmado',
        presente: userStatus === 'presente',
        confirmationState: confirmation.state,
        presenceActionEnabled: confirmation.presenceActionEnabled,
        presenceStatusLabel: confirmation.presenceStatusLabel,
        presenceActionLabel: confirmation.presenceActionLabel,
        presenceRestrictionMessage: confirmation.presenceRestrictionMessage,
    }
}

const COUNTED_PRESENCA_STATUSES = ['agendado', 'presente', 'confirmado']
const PRESENCA_PRIORITY: Record<string, number> = {
    cancelada: 0,
    falta: 1,
    agendado: 2,
    confirmado: 2,
    presente: 3,
}

type PresencaRow = {
    aula_id: string
    aluno_id: string
    status: string
    updated_at?: string | null
    created_at?: string | null
}

function presenceTimestampMs(presenca: PresencaRow) {
    const raw = presenca.updated_at ?? presenca.created_at
    if (!raw) return 0
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) ? parsed : 0
}

function buildPresenceMaps(presencasRows: PresencaRow[], alunoId: string) {
    const latestByAulaAluno: Record<string, PresencaRow> = {}

    presencasRows.forEach((presenca) => {
        const key = `${presenca.aula_id}::${presenca.aluno_id}`
        const current = latestByAulaAluno[key]
        if (!current) {
            latestByAulaAluno[key] = presenca
            return
        }

        const currentTs = presenceTimestampMs(current)
        const nextTs = presenceTimestampMs(presenca)
        if (nextTs > currentTs) {
            latestByAulaAluno[key] = presenca
            return
        }

        if (nextTs === currentTs) {
            const currentPriority = PRESENCA_PRIORITY[current.status] ?? -1
            const nextPriority = PRESENCA_PRIORITY[presenca.status] ?? -1
            if (nextPriority >= currentPriority) {
                latestByAulaAluno[key] = presenca
            }
        }
    })

    const ocupacaoByAula: Record<string, number> = {}
    const userStatusByAula: Record<string, string> = {}

    Object.entries(latestByAulaAluno).forEach(([key, presenca]) => {
        const status = presenca.status
        const [aulaId, rowAlunoId] = key.split('::')
        if (COUNTED_PRESENCA_STATUSES.includes(status)) {
            ocupacaoByAula[aulaId] = (ocupacaoByAula[aulaId] ?? 0) + 1
        }
        if (rowAlunoId === alunoId) {
            userStatusByAula[aulaId] = status
        }
    })

    const statusByAulaAluno: Record<string, string> = {}
    Object.entries(latestByAulaAluno).forEach(([key, presenca]) => {
        statusByAulaAluno[key] = presenca.status
    })

    return { ocupacaoByAula, userStatusByAula, statusByAulaAluno }
}

async function fetchAulasWithPresence(alunoId: string, dateISO: string) {
    const aulasQuery = await supabase
        .from('aulas')
        .select('*')
        .eq('data', dateISO)
        .neq('status', 'cancelada')
        .order('hora_inicio', { ascending: true })

    if (aulasQuery.error) {
        console.error('[Aulas] Erro ao buscar aulas:', aulasQuery.error.message)
        return { aulas: [] as AppAula[], userStatusByAula: {} as Record<string, string> }
    }

    const aulasRows = (aulasQuery.data as Record<string, unknown>[]) ?? []
    const aulaIds = aulasRows.map((aula) => String(aula.id))

    if (aulaIds.length === 0) {
        return { aulas: [] as AppAula[], userStatusByAula: {} as Record<string, string> }
    }

    const presencasQuery = await supabase
        .from('presencas')
        .select('aula_id, aluno_id, status, updated_at, created_at')
        .in('aula_id', aulaIds)

    if (presencasQuery.error) {
        console.error('[Aulas] Erro ao buscar presencas:', presencasQuery.error.message)
    }

    const presencasRows = (presencasQuery.data as PresencaRow[]) ?? []

    const { ocupacaoByAula, userStatusByAula } = buildPresenceMaps(presencasRows, alunoId)

    const aulas = aulasRows.map((row) => {
        const id = String(row.id)
        const mapped = mapAula(row, ocupacaoByAula[id] ?? 0)
        const userStatus = userStatusByAula[id]
        return decorateAulaWithConfirmation(mapped, userStatus)
    })

    return { aulas, userStatusByAula }
}

async function getProximaAula(alunoId: string): Promise<AppAula | null> {
    const todayISO = getTodayISO()
    const tomorrowISO = getTomorrowISO()

    const [todayData, tomorrowData] = await Promise.all([
        fetchAulasWithPresence(alunoId, todayISO),
        fetchAulasWithPresence(alunoId, tomorrowISO),
    ])

    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const orderedToday = [...todayData.aulas].sort(
        (a, b) => horaToMinutes(a.horario) - horaToMinutes(b.horario)
    )
    const firstUpcoming = orderedToday.find((aula) => horaToMinutes(aula.horario) >= nowMinutes)

    if (firstUpcoming) return firstUpcoming
    return tomorrowData.aulas[0] ?? null
}

export async function fetchHomeData(alunoId: string): Promise<HomeData> {
    const todayISO = getTodayISO()
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    // Buscar proximas aulas reais (futuras apenas, suficiente para compor as proximas 7 aulas)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 60)
    const futureDateISO = toISODateLocal(futureDate)

    const [categoriasRes, videosRes, notifsRes, postsRes, aulasRes] = await Promise.allSettled([
        supabase
            .from('trilhas_categorias')
            .select('*')
            .eq('ativo', true)
            .order('ordem', { ascending: true })
            .order('created_at', { ascending: true }),
        supabase
            .from('trilhas_videos')
            .select('*')
            .eq('ativo', true)
            .order('ordem', { ascending: true })
            .order('created_at', { ascending: true }),
        supabase
            .from('notificacoes')
            .select('id, audiencia')
            .or(`aluno_id.eq.${alunoId},aluno_id.is.null`)
            .eq('lida', false),
        supabase
            .from('posts')
            .select('id, conteudo, created_at')
            .eq('publicado', true)
            .order('created_at', { ascending: false })
            .limit(2),
        supabase
            .from('aulas')
            .select('*')
            .gte('data', todayISO)
            .lte('data', futureDateISO)
            .neq('status', 'cancelada')
            .order('data', { ascending: true })
            .order('hora_inicio', { ascending: true })
            .limit(120),
    ])

    const categoriaRows =
        categoriasRes.status === 'fulfilled'
            ? ((categoriasRes.value.data as Record<string, unknown>[]) ?? [])
            : []
    if (categoriasRes.status === 'fulfilled' && categoriasRes.value.error) {
        console.error('[Home] Erro ao buscar categorias de trilhas:', categoriasRes.value.error.message)
    }
    if (categoriasRes.status === 'rejected') {
        console.error('[Home] Falha de rede ao buscar categorias de trilhas:', categoriasRes.reason)
    }

    const videoRows =
        videosRes.status === 'fulfilled'
            ? ((videosRes.value.data as Record<string, unknown>[]) ?? [])
            : []
    if (videosRes.status === 'fulfilled' && videosRes.value.error) {
        console.error('[Home] Erro ao buscar videos das trilhas:', videosRes.value.error.message)
    }
    if (videosRes.status === 'rejected') {
        console.error('[Home] Falha de rede ao buscar videos das trilhas:', videosRes.reason)
    }

    const notificacoesNaoLidas =
        notifsRes.status === 'fulfilled'
            ? (((notifsRes.value.data as Array<{ audiencia?: string | null }>) ?? []).filter((item) => {
                const audience = String(item.audiencia ?? 'aluno').toLowerCase()
                return audience !== 'gestao' && audience !== 'professor'
            }).length)
            : 0
    if (notifsRes.status === 'fulfilled' && notifsRes.value.error) {
        console.error('[Home] Erro ao buscar notificacoes:', notifsRes.value.error.message)
    }
    if (notifsRes.status === 'rejected') {
        console.error('[Home] Falha de rede ao buscar notificacoes:', notifsRes.reason)
    }

    const postsRows =
        postsRes.status === 'fulfilled'
            ? ((postsRes.value.data as Record<string, unknown>[]) ?? [])
            : []
    if (postsRes.status === 'fulfilled' && postsRes.value.error) {
        console.error('[Home] Erro ao buscar avisos:', postsRes.value.error.message)
    }
    if (postsRes.status === 'rejected') {
        console.error('[Home] Falha de rede ao buscar avisos:', postsRes.reason)
    }

    const aulasRows =
        aulasRes.status === 'fulfilled'
            ? ((aulasRes.value.data as Record<string, unknown>[]) ?? [])
            : []
    if (aulasRes.status === 'fulfilled' && aulasRes.value.error) {
        console.error('[Home] Erro ao buscar aulas:', aulasRes.value.error.message)
    }
    if (aulasRes.status === 'rejected') {
        console.error('[Home] Falha de rede ao buscar aulas:', aulasRes.reason)
    }

    const aulaIds = aulasRows.map((row) => String(row.id))
    let presencasRows: PresencaRow[] = []

    if (aulaIds.length > 0) {
        const presencasRes = await supabase
            .from('presencas')
            .select('aula_id, aluno_id, status, updated_at, created_at')
            .in('aula_id', aulaIds)

        if (presencasRes.error) {
            console.error('[Home] Erro ao buscar presencas:', presencasRes.error.message)
        } else {
            presencasRows = (presencasRes.data as PresencaRow[]) ?? []
        }
    }

    // Map de ocupacao e status do usuario
    const { ocupacaoByAula, userStatusByAula } = buildPresenceMaps(presencasRows, alunoId)

    // Processar aulas e filtrar apenas futuras
    const allAulas = aulasRows.map((row) => {
        const id = String(row.id)
        const mapped = mapAula(row, ocupacaoByAula[id] ?? 0)
        const userStatus = userStatusByAula[id]
        return decorateAulaWithConfirmation(mapped, userStatus)
    })

    // Filtrar apenas aulas futuras (data > hoje OU (data === hoje E hora >= agora))
    const aulasFuturas = allAulas.filter((aula) => {
        if (aula.dataISO > todayISO) return true
        if (aula.dataISO === todayISO && horaToMinutes(aula.horario) >= nowMinutes) return true
        return false
    })

    const proximasAulas = aulasFuturas.slice(0, 7)
    const proximaAula = aulasFuturas[0] ?? null

    const videosByCategoria: Record<string, HomeStoryVideo[]> = {}
    videoRows.forEach((row) => {
        const categoriaId = String(row.categoria_id ?? '')
        if (!categoriaId) return

        const thumbnail =
            (row.thumbnail_url as string) ??
            (row.capa_url as string) ??
            (row.preview_url as string) ??
            null

        const mappedVideo: HomeStoryVideo = {
            id: String(row.id),
            titulo: String(row.titulo ?? 'Video do CT'),
            descricao: (row.descricao as string) ?? null,
            video_url: String(row.video_url ?? ''),
            thumbnail,
            duracao: Number(row.duracao ?? 15),
            created_at: (row.created_at as string) ?? null,
        }

        videosByCategoria[categoriaId] = videosByCategoria[categoriaId]
            ? [...videosByCategoria[categoriaId], mappedVideo]
            : [mappedVideo]
    })

    const stories = categoriaRows
        .map((row) => {
            const categoriaId = String(row.id)
            const videos = videosByCategoria[categoriaId] ?? []
            if (videos.length === 0) return null

            const createdAt = (row.created_at as string) ?? videos[0]?.created_at ?? null
            const storyDate = createdAt ? new Date(createdAt) : null
            const storyAgeDays = storyDate
                ? Math.floor((Date.now() - storyDate.getTime()) / (1000 * 60 * 60 * 24))
                : 999

            return {
                id: categoriaId,
                nome: String(row.nome ?? 'Trilha do CT'),
                capa_url:
                    (row.capa_url as string) ??
                    (row.thumbnail_url as string) ??
                    videos[0]?.thumbnail ??
                    null,
                tem_novo: storyAgeDays <= 30,
                total_videos: videos.length,
                created_at: createdAt,
                videos,
            } satisfies HomeStory
        })
        .filter(Boolean) as HomeStory[]

    const avisos = postsRows.map((row) => {
        const texto = String(row.conteudo ?? '')
        const titulo =
            texto.split('\n').find((line) => line.trim().length > 0)?.slice(0, 48) || 'Aviso do CT'
        return {
            id: String(row.id),
            titulo,
            data: toBRDate(row.created_at as string),
            texto,
        }
    })

    return {
        stories,
        notificacoesNaoLidas,
        avisos,
        proximasAulas,
        proximaAula,
    }
}

export async function setPresencaStatus(
    alunoId: string,
    aulaId: string,
    status: 'agendado' | 'presente' | 'cancelada'
) {
    if (status === 'agendado') {
        const aulaRes = await supabase
            .from('aulas')
            .select('id, data, hora_inicio, horario, vagas_total, capacidade_maxima, vagas, maximo_alunos, status')
            .eq('id', aulaId)
            .single()

        if (aulaRes.error || !aulaRes.data) {
            throw new Error(`Nao foi possivel validar a aula: ${aulaRes.error?.message ?? 'aula nao encontrada'}`)
        }

        const ocupacaoRes = await supabase
            .from('presencas')
            .select('aula_id, aluno_id, status, updated_at, created_at')
            .eq('aula_id', aulaId)

        if (ocupacaoRes.error) {
            throw new Error(`Nao foi possivel validar vagas: ${ocupacaoRes.error.message}`)
        }

        const presencasRows = (ocupacaoRes.data as PresencaRow[]) ?? []
        const { ocupacaoByAula, userStatusByAula } = buildPresenceMaps(presencasRows, alunoId)
        const aulaMapeada = mapAula(
            aulaRes.data as unknown as Record<string, unknown>,
            ocupacaoByAula[aulaId] ?? 0
        )
        const confirmation = getAulaConfirmationInfo({
            dataISO: aulaMapeada.dataISO,
            horario: aulaMapeada.horario,
            userStatus: userStatusByAula[aulaId],
            vagasTotal: aulaMapeada.vagas_total,
            vagasOcupadas: aulaMapeada.vagas_ocupadas,
        })

        if (confirmation.state !== 'available' && confirmation.state !== 'booked') {
            throw new Error(confirmation.presenceRestrictionMessage ?? 'Essa aula nao pode ser confirmada agora.')
        }
    }

    const existing = await supabase
        .from('presencas')
        .select('id, status')
        .eq('aluno_id', alunoId)
        .eq('aula_id', aulaId)
        .order('updated_at', { ascending: false })

    if (existing.error) {
        throw new Error(`Nao foi possivel consultar presenca: ${existing.error.message}`)
    }

    const existingRows = existing.data ?? []
    const hadRows = existingRows.length > 0
    const wasPresente = existingRows.some((row) => row.status === 'presente')

    if (hadRows) {
        const updateRes = await supabase
            .from('presencas')
            .update({
                status,
                data_checkin: status === 'presente' ? new Date().toISOString() : null,
            })
            .eq('aluno_id', alunoId)
            .eq('aula_id', aulaId)

        if (updateRes.error) {
            throw new Error(`Nao foi possivel atualizar presenca: ${updateRes.error.message}`)
        }
    } else {
        const insertRes = await supabase.from('presencas').insert({
            aluno_id: alunoId,
            aula_id: aulaId,
            status,
            data_checkin: status === 'presente' ? new Date().toISOString() : null,
        })

        if (insertRes.error) {
            throw new Error(`Nao foi possivel criar presenca: ${insertRes.error.message}`)
        }
    }

    // Se virou check-in (presente), notifica o admin/professor
if (status === 'presente' && !wasPresente) {
        const { data: aluno } = await supabase.from('alunos').select('nome').eq('id', alunoId).single()
        const { data: aula } = await supabase.from('aulas').select('nome, professor').eq('id', aulaId).single()

        if (aluno && aula) {
            await Promise.all([
                insertNotification({
                    tipo: 'aula',
                    titulo: 'Novo check-in realizado',
                    subtitulo: `${aluno.nome} entrou na aula`,
                    mensagem: `${aluno.nome} confirmou presenca na aula "${aula.nome}" com ${aula.professor}.`,
                    acao: 'checkin',
                    link: `/aulas/${aulaId}`,
                    audiencia: 'gestao',
                    icone: 'user-check',
                }),
                insertNotification({
                    tipo: 'aula',
                    titulo: 'Aluno confirmado na sua aula',
                    subtitulo: `${aluno.nome} entrou na aula`,
                    mensagem: `${aluno.nome} confirmou presenca na aula "${aula.nome}".`,
                    acao: 'checkin',
                    link: `/aulas/${aulaId}`,
                    audiencia: 'professor',
                    professor_nome: String(aula.professor ?? ''),
                    icone: 'user-check',
                }),
            ])
        }
    }
}

export async function fetchAgendaData(alunoId: string, selectedDateISO: string): Promise<AgendaData> {
    const diasBase = buildNextDays(7)
    const requestedDate = selectedDateISO || diasBase[0]?.iso || getTodayISO()

    const shouldAppendRequested = !diasBase.some((dia) => dia.iso === requestedDate)
    const daysToFetch = shouldAppendRequested
        ? [...diasBase, { ...buildNextDays(1)[0], iso: requestedDate, label: toBRDate(requestedDate) }]
        : diasBase

    const dateSet = [...new Set(daysToFetch.map((dia) => dia.iso))]
    const aulasPorDia = await Promise.all(
        dateSet.map(async (iso) => {
            const result = await fetchAulasWithPresence(alunoId, iso)
            return [iso, result.aulas] as const
        })
    )

    const aulasMap = Object.fromEntries(aulasPorDia)
    const selectedAulas = aulasMap[requestedDate] ?? []
    const proximaAula = await getProximaAula(alunoId)

    const dias = daysToFetch.map((dia) => ({
        iso: dia.iso,
        label: dia.label,
        shortLabel: dia.shortLabel,
        dayNumber: dia.dayNumber,
        isToday: dia.isToday,
        hasClasses: (aulasMap[dia.iso] ?? []).length > 0,
    }))

    return {
        selectedDateISO: requestedDate,
        selectedLabel: toBRDate(requestedDate),
        dias,
        aulas: selectedAulas,
        proximaAula,
    }
}

export async function fetchFeedData(alunoId: string): Promise<FeedPost[]> {
    const postsRes = await supabase
        .from('posts')
        .select('*')
        .eq('publicado', true)
        .order('created_at', { ascending: false })

    const postRows = (postsRes.data as Record<string, unknown>[]) ?? []
    const postIds = postRows.map((post) => String(post.id))

    if (postIds.length === 0) return []

    const commentsRes = await supabase
        .from('post_comentarios')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: false })

    const likesRes = await supabase
        .from('post_curtidas')
        .select('post_id, aluno_id')
        .in('post_id', postIds)

    const commentsRows = !isMissingTable(commentsRes.error)
        ? ((commentsRes.data as Record<string, unknown>[]) ?? [])
        : []
    const likesRows = !isMissingTable(likesRes.error)
        ? ((likesRes.data as Array<{ post_id: string; aluno_id: string }>) ?? [])
        : []

    const commentsByPost: Record<string, FeedComment[]> = {}

    commentsRows.forEach((comment) => {
        const postId = String(comment.post_id)
        const author =
            String(comment.autor_nome ?? comment.autor ?? comment.nome ?? 'Aluno do CT') || 'Aluno do CT'
        const mapped: FeedComment = {
            id: String(comment.id),
            autor: author,
            iniciais: getInitials(author),
            texto: String(comment.texto ?? ''),
            data: toBRDateTime(comment.created_at as string),
        }
        commentsByPost[postId] = commentsByPost[postId] ? [...commentsByPost[postId], mapped] : [mapped]
    })

    const likesCountByPost: Record<string, number> = {}
    const likedByMe: Record<string, boolean> = {}

    likesRows.forEach((like) => {
        likesCountByPost[like.post_id] = (likesCountByPost[like.post_id] ?? 0) + 1
        if (like.aluno_id === alunoId) likedByMe[like.post_id] = true
    })

    return postRows.map((row) => {
        const id = String(row.id)
        const autor = String(row.autor ?? 'CT Boxe')
        const fallbackLikes = Number(row.total_curtidas ?? 0) || 0
        return {
            id,
            autor,
            iniciais: getInitials(autor),
            data: toBRDateTime(row.created_at as string),
            texto: String(row.conteudo ?? ''),
            imagem: (row.imagem_url as string) ?? null,
            curtidas: likesCountByPost[id] ?? fallbackLikes,
            comentarios: commentsByPost[id] ?? [],
            likedByMe: Boolean(likedByMe[id]),
        }
    })
}

export async function fetchSinglePost(alunoId: string, postId: string): Promise<FeedPost | null> {
    const postRes = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .eq('publicado', true)
        .maybeSingle()

    if (!postRes.data) return null

    const postRow = postRes.data as Record<string, unknown>

    const [commentsRes, likesRes] = await Promise.all([
        supabase
            .from('post_comentarios')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: false }),
        supabase
            .from('post_curtidas')
            .select('post_id, aluno_id')
            .eq('post_id', postId)
    ])

    const commentsRows = !isMissingTable(commentsRes.error)
        ? ((commentsRes.data as Record<string, unknown>[]) ?? [])
        : []
    const likesRows = !isMissingTable(likesRes.error)
        ? ((likesRes.data as Array<{ post_id: string; aluno_id: string }>) ?? [])
        : []

    const comentarios: FeedComment[] = commentsRows.map((comment) => {
        const author =
            String(comment.autor_nome ?? comment.autor ?? comment.nome ?? 'Aluno do CT') || 'Aluno do CT'
        return {
            id: String(comment.id),
            autor: author,
            iniciais: getInitials(author),
            texto: String(comment.texto ?? ''),
            data: toBRDateTime(comment.created_at as string),
        }
    })

    const curtidas = likesRows.length
    const likedByMe = likesRows.some(like => like.aluno_id === alunoId)

    const autor = String(postRow.autor ?? 'CT Boxe')
    return {
        id: String(postRow.id),
        autor,
        iniciais: getInitials(autor),
        data: toBRDateTime(postRow.created_at as string),
        texto: String(postRow.conteudo ?? ''),
        imagem: (postRow.imagem_url as string) ?? null,
        curtidas,
        comentarios,
        likedByMe,
    }
}

export async function addFeedComment(postId: string, alunoId: string, texto: string) {
    if (!texto.trim()) return

    const { data: aluno } = await supabase
        .from('alunos')
        .select('nome')
        .eq('id', alunoId)
        .single()

    await supabase.from('post_comentarios').insert({
        post_id: postId,
        aluno_id: alunoId,
        autor_nome: aluno?.nome ?? 'Aluno',
        texto: texto.trim(),
    })

    // Notificar gestão sobre novo comentário
    const { data: post } = await supabase.from('posts').select('conteudo').eq('id', postId).single()

    if (post && aluno) {
        await insertNotification({
            titulo: 'Novo comentario no feed',
            subtitulo: `${aluno.nome} comentou em uma postagem`,
            mensagem: `${aluno.nome}: "${texto.substring(0, 40)}${texto.length > 40 ? '...' : ''}"`,
            tipo: 'ct',
            acao: 'comment',
            link: '/feed',
            audiencia: 'gestao',
            icone: 'message-square',
        })
    }
}

export async function toggleFeedLike(postId: string, alunoId: string, currentlyLiked: boolean) {
    if (currentlyLiked) {
        await supabase
            .from('post_curtidas')
            .delete()
            .eq('post_id', postId)
            .eq('aluno_id', alunoId)
    } else {
        await supabase.from('post_curtidas').insert({ post_id: postId, aluno_id: alunoId })

        // Notifica a gestão sobre novo engajamento
        const { data: post } = await supabase.from('posts').select('conteudo').eq('id', postId).single()
        const { data: aluno } = await supabase.from('alunos').select('nome').eq('id', alunoId).single()

        if (post && aluno) {
            await insertNotification({
                titulo: 'Nova curtida no feed',
                subtitulo: `${aluno.nome} curtiu uma postagem`,
                mensagem: `${aluno.nome} curtiu: "${post.conteudo?.substring(0, 40)}${String(post.conteudo ?? '').length > 40 ? '...' : ''}"`,
                tipo: 'ct',
                acao: 'like',
                link: '/feed',
                audiencia: 'gestao',
                icone: 'heart',
            })
        }
    }

    const countRes = await supabase
        .from('post_curtidas')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)

    return {
        likedByMe: !currentlyLiked,
        curtidas: countRes.count ?? 0,
    }
}

export async function fetchHistoricoData(alunoId: string, monthStr: string): Promise<HistoricoData> {
    const year = parseInt(monthStr.split('-')[0])
    let monthNum = parseInt(monthStr.split('-')[1])
    const startIso = `${year}-${monthNum.toString().padStart(2, '0')}-01T00:00:00.000Z`

    let nextYear = year
    let nextMonth = monthNum + 1
    if (nextMonth > 12) {
        nextYear += 1
        nextMonth = 1
    }
    const endIso = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`

    const [monthRes, totalRes, streakRes] = await Promise.all([
        supabase
            .from('presencas')
            .select('id, created_at, data_checkin, aulas(titulo)')
            .eq('aluno_id', alunoId)
            .eq('status', 'presente')
            .gte('created_at', startIso)
            .lt('created_at', endIso)
            .order('created_at', { ascending: false }),
        supabase
            .from('presencas')
            .select('id', { count: 'exact', head: true })
            .eq('aluno_id', alunoId)
            .eq('status', 'presente'),
        supabase
            .from('presencas')
            .select('created_at, data_checkin')
            .eq('aluno_id', alunoId)
            .eq('status', 'presente')
            .order('created_at', { ascending: false })
            .limit(120),
    ])

    const monthRows = (monthRes.data as Record<string, unknown>[]) ?? []
    const days = monthRows.map((row) => {
        const dateValue = (row.data_checkin as string) ?? (row.created_at as string)
        return new Date(dateValue).getDate()
    })

    const uniqueDays = [...new Set(days)].sort((a, b) => a - b)

    const presencasLista = monthRows.map((row) => {
        const aulaObj = row.aulas as { titulo?: string } | null
        return {
            id: String(row.id),
            data: toBRDate((row.data_checkin as string) ?? (row.created_at as string)),
            aula: aulaObj?.titulo ?? 'Treino de Boxe',
        }
    })

    const streakRows = (streakRes.data as Array<{ created_at?: string; data_checkin?: string }>) ?? []
    const streakDates = [...new Set(
        streakRows
            .map((row) => {
                const raw = row.data_checkin ?? row.created_at
                if (!raw) return null
                return new Date(raw).toISOString().slice(0, 10)
            })
            .filter(Boolean) as string[]
    )].sort((a, b) => (a > b ? -1 : 1))

    let sequencia = 0
    for (let i = 0; i < streakDates.length; i += 1) {
        if (i === 0) {
            sequencia = 1
            continue
        }
        const prev = new Date(streakDates[i - 1])
        const current = new Date(streakDates[i])
        const diff = Math.round((prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) sequencia += 1
        else break
    }

    const d = new Date(startIso)
    return {
        mesLabel: monthLabel(d),
        resumo: {
            mes: monthRows.length,
            sequencia: streakDates.length > 0 ? sequencia : 0,
            total: totalRes.count ?? 0,
        },
        diasComPresenca: uniqueDays,
        presencasLista,
    }
}

export async function fetchPerfilData(alunoId: string): Promise<PerfilData> {
    const [alunoRes, docOpenRes, docSignedRes] = await Promise.all([
        supabase.from('alunos').select('*').eq('id', alunoId).maybeSingle(),
        supabase
            .from('aluno_documentos')
            .select('*')
            .eq('aluno_id', alunoId)
            .eq('status', 'pendente')
            .order('emitido_em', { ascending: false }),
        supabase
            .from('aluno_documentos')
            .select('*')
            .eq('aluno_id', alunoId)
            .eq('status', 'assinado')
            .order('assinado_em', { ascending: false }),
    ])

    const status = await fetchContractStatus(alunoId)

    const contratosAbertos = !isMissingTable(docOpenRes.error)
        ? ((docOpenRes.data as DocumentoAluno[]) ?? [])
        : []
    const contratosAssinados = !isMissingTable(docSignedRes.error)
        ? ((docSignedRes.data as DocumentoAluno[]) ?? [])
        : []

    return {
        aluno: (alunoRes.data as AlunoProfile | null) ?? null,
        contratoStatus: status,
        contratosAbertos,
        contratosAssinados,
    }
}

export async function fetchContractStatus(alunoId: string): Promise<ContractBannerStatus> {
    const paymentRes = await supabase
        .from('pagamentos')
        .select('valor, status, data_vencimento, contrato_id')
        .eq('aluno_id', alunoId)
        .in('status', ['pendente', 'vencido'])
        .order('data_vencimento', { ascending: true })
        .limit(1)
        .maybeSingle()

    const contractRes = await supabase
        .from('contratos_com_status')
        .select('plano_nome, data_fim, valor')
        .eq('aluno_id', alunoId)
        .order('data_fim', { ascending: true })
        .limit(1)
        .maybeSingle()

    const dueDate =
        (paymentRes.data?.data_vencimento as string | undefined) ??
        (contractRes.data?.data_fim as string | undefined) ??
        null

    const days = daysUntil(dueDate)
    const pendingValue = paymentRes.data?.valor as number | null
    const contractValue = contractRes.data?.valor as number | null
    const status: ContractBannerStatus = {
        status: 'em_dia',
        data_vencimento: dueDate,
        dias_para_vencer: days,
        valor: pendingValue ?? contractValue ?? null,
        plano: (contractRes.data?.plano_nome as string) ?? 'Plano CT Boxe',
    }

    if (paymentRes.data && (paymentRes.data.status === 'vencido' || days < 0)) {
        status.status = 'vencido'
    } else if (days <= 3) {
        status.status = 'vencendo'
    }

    return status
}

function toRelativeTime(dateIso?: string | null) {
    if (!dateIso) return '-'
    const date = new Date(dateIso)
    const diffMs = Date.now() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    if (diffMinutes < 1) return 'Agora'
    if (diffMinutes < 60) return `Ha ${diffMinutes} min`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `Ha ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return diffDays === 1 ? 'Ontem' : `Ha ${diffDays} dias`
}

export async function fetchNotificacoes(alunoId: string): Promise<HomeNotification[]> {
    const res = await supabase
        .from('notificacoes')
        .select('*')
        .or(`aluno_id.eq.${alunoId},aluno_id.is.null`)
        .order('created_at', { ascending: false })

    if (isMissingTable(res.error)) return []

    const rows = (res.data as Record<string, unknown>[]) ?? []
    return rows
        .filter((row) => {
            const audience = String(row.audiencia ?? 'aluno').toLowerCase()
            return audience !== 'gestao' && audience !== 'professor'
        })
        .map((row) => ({
        id: String(row.id),
        tipo: String(row.tipo ?? 'ct'),
        titulo: String(row.titulo ?? 'Notificacao'),
        subtitulo: String(row.subtitulo ?? row.mensagem ?? ''),
        mensagem: (row.mensagem as string) ?? null,
        horario: toRelativeTime(row.created_at as string),
        lida: Boolean(row.lida),
        acao: (row.acao as string) ?? null,
        link: (row.link as string) ?? null,
        actionLabel: mapNotificationActionLabel(
            String(row.tipo ?? 'ct'),
            (row.acao as string) ?? null
        ),
        created_at: (row.created_at as string) ?? null,
        icone: (row.icone as string) ?? null,
        audiencia: (row.audiencia as string) ?? 'aluno',
    }))
}

export async function markNotificacaoLida(id: string) {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
}

export async function markAllNotificacoesLidas(alunoId: string) {
    await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('lida', false)
        .or(`aluno_id.eq.${alunoId},aluno_id.is.null`)
}

export async function fetchEventos(alunoId: string): Promise<EventoApp[]> {
    const eventsRes = await supabase
        .from('eventos')
        .select('*')
        .eq('ativo', true)
        .order('data_evento', { ascending: true })

    if (isMissingTable(eventsRes.error)) return []

    const rows = (eventsRes.data as Record<string, unknown>[]) ?? []
    const eventIds = rows.map((row) => String(row.id))

    if (eventIds.length === 0) return []

    const confirmRes = await supabase
        .from('evento_confirmacoes')
        .select('evento_id, aluno_id, status')
        .in('evento_id', eventIds)

    const confirmations = !isMissingTable(confirmRes.error)
        ? ((confirmRes.data as Array<{ evento_id: string; aluno_id: string; status: string }>) ?? [])
        : []

    const countByEvento: Record<string, number> = {}
    const userStatusByEvento: Record<string, 'confirmado' | 'pendente'> = {}

    confirmations.forEach((item) => {
        if (item.status === 'confirmado') {
            countByEvento[item.evento_id] = (countByEvento[item.evento_id] ?? 0) + 1
        }
        if (item.aluno_id === alunoId) {
            userStatusByEvento[item.evento_id] = item.status === 'confirmado' ? 'confirmado' : 'pendente'
        }
    })

    return rows.map((row) => {
        const id = String(row.id)
        return {
            id,
            titulo: String(row.titulo ?? 'Evento'),
            descricao: (row.descricao as string) ?? '',
            data_evento: String(row.data_evento),
            local: (row.local as string) ?? 'CT Argel Riboli',
            icone: (row.icone as string) ?? '🥊',
            imagem_url: (row.imagem_url as string) ?? null,
            valor: row.valor != null ? Number(row.valor) : null,
            destaque: Boolean(row.destaque),
            ativo: Boolean(row.ativo),
            confirmados: countByEvento[id] ?? Number(row.confirmados ?? 0) ?? 0,
            status_usuario: userStatusByEvento[id] ?? 'pendente',
        }
    })
}

export async function setConfirmacaoEvento(alunoId: string, eventoId: string, confirmado: boolean) {
    if (confirmado) {
        await supabase.from('evento_confirmacoes').upsert(
            {
                evento_id: eventoId,
                aluno_id: alunoId,
                status: 'confirmado',
            },
            { onConflict: 'evento_id,aluno_id' }
        )

        const [{ data: aluno }, { data: evento }] = await Promise.all([
            supabase.from('alunos').select('nome').eq('id', alunoId).maybeSingle(),
            supabase.from('eventos').select('titulo').eq('id', eventoId).maybeSingle(),
        ])

        if (aluno?.nome && evento?.titulo) {
            await insertNotification({
                titulo: 'Confirmacao de evento',
                subtitulo: `${aluno.nome} confirmou presenca em um evento`,
                mensagem: `${aluno.nome} confirmou: ${evento.titulo}`,
                tipo: 'evento',
                acao: 'evento',
                link: '/eventos',
                audiencia: 'gestao',
                icone: 'party-popper',
            })
        }
    } else {
        await supabase
            .from('evento_confirmacoes')
            .delete()
            .eq('evento_id', eventoId)
            .eq('aluno_id', alunoId)
    }
}

export async function fetchFaturas(alunoId: string): Promise<FaturaItem[]> {
    const res = await supabase
        .from('pagamentos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('status', 'pago')
        .order('data_pagamento', { ascending: false })

    return ((res.data as Record<string, unknown>[]) ?? []).map((row) => ({
        id: String(row.id),
        valor: Number(row.valor ?? 0),
        data_vencimento: (row.data_vencimento as string) ?? null,
        data_pagamento: (row.data_pagamento as string) ?? null,
        status: String(row.status ?? 'pago'),
        metodo: (row.metodo as string) ?? null,
        comprovante: Boolean(row.qr_code || row.qr_code_base64 || row.pix_copia_cola),
    }))
}

export async function fetchContratos(alunoId: string) {
    const [docsOpenRes, docsSignedRes, contratosRes] = await Promise.all([
        supabase
            .from('aluno_documentos')
            .select('*')
            .eq('aluno_id', alunoId)
            .eq('status', 'pendente')
            .order('emitido_em', { ascending: false }),
        supabase
            .from('aluno_documentos')
            .select('*')
            .eq('aluno_id', alunoId)
            .eq('status', 'assinado')
            .order('assinado_em', { ascending: false }),
        supabase
            .from('contratos_com_status')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('data_inicio', { ascending: false }),
    ])

    const docsOpen = !isMissingTable(docsOpenRes.error)
        ? ((docsOpenRes.data as DocumentoAluno[]) ?? [])
        : []

    const docsSigned = !isMissingTable(docsSignedRes.error)
        ? ((docsSignedRes.data as DocumentoAluno[]) ?? [])
        : []

    const contratosAssinadosFromPlanos = ((contratosRes.data as Record<string, unknown>[]) ?? []).map((row) => ({
        id: String(row.id),
        titulo: String(row.plano_nome ?? 'Contrato de Plano'),
        status: 'assinado' as const,
        emitido_em: (row.data_inicio as string) ?? null,
        assinado_em: (row.created_at as string) ?? null,
        validade: (row.data_fim as string) ?? null,
    }))

    return {
        contratosAbertos: docsOpen,
        contratosAssinados: [...docsSigned, ...contratosAssinadosFromPlanos],
    }
}

export async function fetchDocumentoAluno(id: string): Promise<DocumentoAluno | null> {
    const res = await supabase.from('aluno_documentos').select('*').eq('id', id).maybeSingle()
    return (res.data as DocumentoAluno | null) ?? null
}

export async function assinarDocumento(id: string) {
    await supabase
        .from('aluno_documentos')
        .update({ status: 'assinado', assinado_em: new Date().toISOString() })
        .eq('id', id)
}

export async function updateAlunoDados(alunoId: string, payload: Partial<AlunoProfile>) {
    const cleanPayload: Record<string, unknown> = {}
    if (payload.nome !== undefined) cleanPayload.nome = payload.nome
    if (payload.email !== undefined) cleanPayload.email = payload.email?.toLowerCase()
    if (payload.telefone !== undefined) cleanPayload.telefone = payload.telefone
    if (payload.data_nascimento !== undefined) cleanPayload.data_nascimento = payload.data_nascimento
    if (payload.cpf !== undefined) cleanPayload.cpf = payload.cpf
    await supabase.from('alunos').update(cleanPayload).eq('id', alunoId)
}

export async function uploadFotoPerfil(alunoId: string, imageUri: string): Promise<string> {
    // Use fetch to read the file as blob (new recommended approach)
    const response = await fetch(imageUri)
    const blob = await response.blob()

    const ext = imageUri.split('.').pop() || 'jpg'
    const filePath = `${alunoId}/${new Date().getTime()}.${ext}`

    const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: `image/${ext}`, upsert: true })

    if (error) throw error

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const fotoUrl = publicUrlData.publicUrl

    await supabase.from('alunos').update({ foto_url: fotoUrl }).eq('id', alunoId)
    return fotoUrl
}

export async function fetchPagamentoAtual(alunoId: string): Promise<PagamentoAtual | null> {
    const paymentRes = await supabase
        .from('pagamentos')
        .select('*')
        .eq('aluno_id', alunoId)
        .in('status', ['pendente', 'vencido'])
        .order('data_vencimento', { ascending: true })
        .limit(1)
        .maybeSingle()

    let payment = paymentRes.data as Record<string, unknown> | null

    if (!payment) {
        const latestRes = await supabase
            .from('pagamentos')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        payment = (latestRes.data as Record<string, unknown> | null) ?? null
    }

    if (!payment) return null

    const contractRes = payment.contrato_id
        ? await supabase
            .from('contratos_com_status')
            .select('plano_nome')
            .eq('id', payment.contrato_id as string)
            .maybeSingle()
        : null

    return {
        id: String(payment.id),
        status: String(payment.status ?? 'pendente'),
        valor: Number(payment.valor ?? 0),
        data_vencimento: (payment.data_vencimento as string) ?? null,
        qr_code_base64: (payment.qr_code_base64 as string) ?? null,
        pix_copia_cola: (payment.pix_copia_cola as string) ?? null,
        plano: (contractRes?.data?.plano_nome as string) ?? 'Plano CT Boxe',
    }
}

export async function fetchAulaDetalhe(alunoId: string, aulaId: string): Promise<AulaDetalhe | null> {
    const aulaRes = await supabase.from('aulas').select('*').eq('id', aulaId).maybeSingle()
    const aulaRow = (aulaRes.data as Record<string, unknown> | null) ?? null
    if (!aulaRow) return null

    const presencasRes = await supabase
        .from('presencas')
        .select('aula_id, aluno_id, status, updated_at, created_at')
        .eq('aula_id', aulaId)

    if (presencasRes.error) {
        console.error('[AulaDetalhe] Erro ao buscar presencas:', presencasRes.error.message)
    }

    const presencas = (presencasRes.data as PresencaRow[]) ?? []
    const { ocupacaoByAula, userStatusByAula, statusByAulaAluno } = buildPresenceMaps(presencas, alunoId)

    const alunosConfirmadosIds = Object.entries(statusByAulaAluno)
        .filter(([key, status]) => key.startsWith(`${aulaId}::`) && COUNTED_PRESENCA_STATUSES.includes(status))
        .map(([key]) => key.split('::')[1])

    const alunoIds = [...new Set(alunosConfirmadosIds)]

    const alunosRes =
        alunoIds.length > 0
            ? await supabase.from('alunos').select('id, nome').in('id', alunoIds)
            : { data: [] as Array<{ id: string; nome: string }> }

    const nomeById: Record<string, string> = {}
        ; ((alunosRes.data as Array<{ id: string; nome: string }>) ?? []).forEach((aluno) => {
            nomeById[aluno.id] = aluno.nome
        })

    const confirmados = alunoIds
        .map((id) => nomeById[id])
        .filter(Boolean)
        .slice(0, 12)

    const userStatus = userStatusByAula[aulaId] ?? null
    const vagasOcupadas = ocupacaoByAula[aulaId] ?? 0
    const mapped = mapAula(aulaRow, vagasOcupadas)

    return {
        id: mapped.id,
        nome: mapped.nome,
        horario: mapped.horario,
        data: mapped.data,
        dataISO: mapped.dataISO,
        professor: mapped.professor,
        descricao: mapped.descricao ?? 'Treino tecnico de boxe para todos os niveis.',
        vagas_total: mapped.vagas_total,
        vagas_ocupadas: vagasOcupadas,
        confirmados,
        userStatus,
    }
}
