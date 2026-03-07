import type { PostgrestError } from '@supabase/supabase-js'

import { Alert } from 'react-native'
import { daysUntil, getInitials, monthLabel, toBRDate, toBRDateTime, toBRTime, toISODateLocal } from '@/lib/formatters'
import { supabase } from './supabase'
import type {
    AlunoProfile,
    AppAula,
    ContractBannerStatus,
    DocumentoAluno,
    EventoApp,
    FeedComment,
    FeedPost,
    HomeNotification,
    HomeStory,
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
    aulasHoje: AppAula[]
    proximaAula: AppAula | null
}

export interface CheckinData {
    hoje: AppAula[]
    amanha: AppAula[]
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

function horaToMinutes(hora: string) {
    if (!hora || !hora.includes(':')) return 0
    const [h, m] = hora.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
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
        return {
            ...mapped,
            agendado: userStatus === 'agendado' || userStatus === 'confirmado',
            presente: userStatus === 'presente',
        }
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

    // Buscar proximas aulas (futuras apenas, proximos 7 dias)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const futureDateISO = toISODateLocal(futureDate)

    const [storiesRes, notifsRes, postsRes, aulasRes] = await Promise.allSettled([
        supabase.from('stories_ativos').select('*').order('created_at', { ascending: false }),
        supabase
            .from('notificacoes')
            .select('id', { count: 'exact' })
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
            .limit(15),
    ])

    const storiesRows =
        storiesRes.status === 'fulfilled'
            ? ((storiesRes.value.data as Record<string, unknown>[]) ?? [])
            : []
    if (storiesRes.status === 'fulfilled' && storiesRes.value.error) {
        console.error('[Home] Erro ao buscar stories:', storiesRes.value.error.message)
    }
    if (storiesRes.status === 'rejected') {
        console.error('[Home] Falha de rede ao buscar stories:', storiesRes.reason)
    }

    const notificacoesNaoLidas =
        notifsRes.status === 'fulfilled' ? (notifsRes.value.count ?? 0) : 0
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
        return {
            ...mapped,
            agendado: userStatus === 'agendado' || userStatus === 'confirmado',
            presente: userStatus === 'presente',
            data: String(row.data),
        }
    })

    // Filtrar apenas aulas futuras (data > hoje OU (data === hoje E hora >= agora))
    const aulasFuturas = allAulas.filter((aula) => {
        if (aula.data > todayISO) return true
        if (aula.data === todayISO && horaToMinutes(aula.horario) >= nowMinutes) return true
        return false
    })

    // Pegar as proximas 10 aulas
    const aulasHoje = aulasFuturas.slice(0, 10)
    const proximaAula = aulasFuturas[0] ?? null

    const stories = storiesRows.map((row) => ({
        id: String(row.id),
        nome: String(row.autor ?? 'CT Boxe'),
        thumbnail: (row.imagem_url as string) ?? null,
        assistido: false,
        duracao: Number(row.duracao ?? 15),
        created_at: (row.created_at as string) ?? null,
    })) as HomeStory[]

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
        aulasHoje,
        proximaAula,
    }
}

export async function setPresencaStatus(
    alunoId: string,
    aulaId: string,
    status: 'agendado' | 'presente' | 'cancelada'
) {
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
            await supabase.from('notificacoes').insert({
                titulo: 'Novo Check-in realizado',
                subtitulo: `${aluno.nome} entrou na aula`,
                mensagem: `${aluno.nome} confirmou presença na aula "${aula.nome}" com ${aula.professor}`,
                tipo: 'aula',
                lida: false,
                acao: 'checkin',
                link: `/aulas/${aulaId}`
            })
        }
    }
}

export async function fetchCheckinData(alunoId: string): Promise<CheckinData> {
    const [hoje, amanha, proximaAula] = await Promise.all([
        fetchAulasWithPresence(alunoId, getTodayISO()),
        fetchAulasWithPresence(alunoId, getTomorrowISO()),
        getProximaAula(alunoId),
    ])

    return {
        hoje: hoje.aulas,
        amanha: amanha.aulas,
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

    // Notificar sobre novo comentário
    const { data: post } = await supabase.from('posts').select('conteudo').eq('id', postId).single()

    if (post && aluno) {
        await supabase.from('notificacoes').insert({
            titulo: 'Novo comentário no Feed',
            subtitulo: `${aluno.nome} comentou em um post`,
            mensagem: `${aluno.nome}: "${texto.substring(0, 40)}..."`,
            tipo: 'ct',
            lida: false,
            acao: 'comment',
            link: '/feed'
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

        // Notifica o autor do post e o adm
        const { data: post } = await supabase.from('posts').select('conteudo').eq('id', postId).single()
        const { data: aluno } = await supabase.from('alunos').select('nome').eq('id', alunoId).single()

        if (post && aluno) {
            await supabase.from('notificacoes').insert({
                titulo: 'Nova curtida no Feed',
                subtitulo: `${aluno.nome} curtiu seu post`,
                mensagem: `${aluno.nome} curtiu: "${post.conteudo?.substring(0, 40)}..."`,
                tipo: 'ct',
                lida: false,
                acao: 'like',
                link: '/feed'
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
    return rows.map((row) => ({
        id: String(row.id),
        tipo: String(row.tipo ?? 'ct'),
        titulo: String(row.titulo ?? 'Notificacao'),
        subtitulo: String(row.subtitulo ?? row.mensagem ?? ''),
        horario: toRelativeTime(row.created_at as string),
        lida: Boolean(row.lida),
        acao: (row.acao as string) ?? null,
        link: (row.link as string) ?? null,
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
