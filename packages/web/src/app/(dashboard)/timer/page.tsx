'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play, Settings, Square, Volume2, VolumeX, History, Watch, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type FaseTimer = 'preparacao' | 'trabalho' | 'descanso'

interface TimerConfig {
    rounds: number
    trabalhoSegundos: number
    descansoSegundos: number
    preparacaoSegundos: number
    avisoFimSegundos: number
    avisoProximoRoundSegundos: number
}

interface TimerPreset {
    id: string
    nome: string
    descricao: string
    config: TimerConfig
}

type SoundKey = 'countdown' | 'roundWarning' | 'nextRoundWarning' | 'phaseChange' | 'finish'

interface SoundPlaybackOptions {
    delayMs?: number
    playbackRate?: number
    volume?: number
}

const STORAGE_KEY = 'ct-timer-config-v2'

const DEFAULT_CONFIG: TimerConfig = {
    rounds: 3,
    trabalhoSegundos: 180,
    descansoSegundos: 60,
    preparacaoSegundos: 10,
    avisoFimSegundos: 10,
    avisoProximoRoundSegundos: 10,
}
const DURACOES_TRABALHO = [20, 60, 120, 180, 240, 300]
const DURACOES_DESCANSO = [10, 30, 45, 60]

const SOUND_SOURCES: Record<SoundKey, string> = {
    countdown: '/sounds/timer-countdown.wav',
    roundWarning: '/sounds/timer-round-warning.wav',
    nextRoundWarning: '/sounds/timer-next-round-warning.wav',
    phaseChange: '/sounds/timer-phase-change.wav',
    finish: '/sounds/timer-finish.wav',
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

function normalizarConfig(raw: Partial<TimerConfig> | null | undefined): TimerConfig {
    const rounds = clamp(Number(raw?.rounds ?? DEFAULT_CONFIG.rounds), 1, 20)
    const trabalhoSegundos = clamp(Number(raw?.trabalhoSegundos ?? DEFAULT_CONFIG.trabalhoSegundos), 10, 900)
    const descansoSegundos = clamp(Number(raw?.descansoSegundos ?? DEFAULT_CONFIG.descansoSegundos), 10, 600)
    const preparacaoSegundos = clamp(Number(raw?.preparacaoSegundos ?? DEFAULT_CONFIG.preparacaoSegundos), 3, 180)

    const avisoFimSegundos = clamp(Number(raw?.avisoFimSegundos ?? DEFAULT_CONFIG.avisoFimSegundos), 0, Math.max(0, trabalhoSegundos - 1))
    const avisoProximoRoundSegundos = clamp(Number(raw?.avisoProximoRoundSegundos ?? DEFAULT_CONFIG.avisoProximoRoundSegundos), 0, Math.max(0, descansoSegundos - 1))

    return { rounds, trabalhoSegundos, descansoSegundos, preparacaoSegundos, avisoFimSegundos, avisoProximoRoundSegundos }
}

function formatarTempo(segundos: number) {
    const seguro = Math.max(0, segundos)
    const minutos = Math.floor(seguro / 60)
    const segs = seguro % 60
    return `${minutos < 10 ? '0' : ''}${minutos}:${segs < 10 ? '0' : ''}${segs}`
}

function formatarMinSeg(segundos: number) {
    const minutos = Math.floor(segundos / 60)
    const segs = segundos % 60
    return `${minutos}:${segs.toString().padStart(2, '0')}`
}

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function TimerPage() {
    const router = useRouter()
    const supabase = createClient()
    const [presetsDb, setPresetsDb] = useState<TimerPreset[]>([])
    const [nomePreset, setNomePreset] = useState('')

    const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG)
    const [configEdicao, setConfigEdicao] = useState<TimerConfig>(DEFAULT_CONFIG)
    const [configAberto, setConfigAberto] = useState(false)

    const [ativo, setAtivo] = useState(false)
    const [fase, setFase] = useState<FaseTimer>('preparacao')
    const [roundAtual, setRoundAtual] = useState(1)
    const [duracaoFaseAtual, setDuracaoFaseAtual] = useState(DEFAULT_CONFIG.preparacaoSegundos)
    const [tempoRestante, setTempoRestante] = useState(DEFAULT_CONFIG.preparacaoSegundos)

    const [somStatus, setSomStatus] = useState(true)

    const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const deadlineRef = useRef<number | null>(null)
    const ultimoSegundoProcessadoRef = useRef<number | null>(null)
    const audioBasesRef = useRef<Record<SoundKey, HTMLAudioElement | null>>({
        countdown: null, roundWarning: null, nextRoundWarning: null, phaseChange: null, finish: null,
    })
    const audioDesbloqueadoRef = useRef(false)

    const configRef = useRef(config)
    const faseRef = useRef(fase)
    const roundRef = useRef(roundAtual)
    const tempoRestanteRef = useRef(tempoRestante)
    const ativoRef = useRef(ativo)
    const somStatusRef = useRef(somStatus)

    useEffect(() => { configRef.current = config }, [config])
    useEffect(() => { faseRef.current = fase }, [fase])
    useEffect(() => { roundRef.current = roundAtual }, [roundAtual])
    useEffect(() => { tempoRestanteRef.current = tempoRestante }, [tempoRestante])
    useEffect(() => { ativoRef.current = ativo }, [ativo])
    useEffect(() => { somStatusRef.current = somStatus }, [somStatus])

    const fetchPresets = useCallback(async () => {
        const { data } = await supabase.from('timers_presets').select('*').eq('ativo', true).order('created_at', { ascending: true })
        if (data) {
            const map = data.map((d: {
                id: string
                nome: string
                descricao?: string | null
                rounds: number
                trabalho_segundos: number
                descanso_segundos: number
                preparacao_segundos: number
                aviso_fim_segundos: number
                aviso_proximo_round_segundos: number
            }) => ({
                id: d.id,
                nome: d.nome,
                descricao: d.descricao || `${d.rounds} Rounds x ${formatarMinSeg(d.trabalho_segundos)} / ${formatarMinSeg(d.descanso_segundos)}`,
                config: {
                    rounds: d.rounds,
                    trabalhoSegundos: d.trabalho_segundos,
                    descansoSegundos: d.descanso_segundos,
                    preparacaoSegundos: d.preparacao_segundos,
                    avisoFimSegundos: d.aviso_fim_segundos,
                    avisoProximoRoundSegundos: d.aviso_proximo_round_segundos
                }
            }))
            setPresetsDb(map)
        }
    }, [supabase])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const keys = Object.keys(SOUND_SOURCES) as SoundKey[]
        keys.forEach(key => {
            const audio = new Audio(SOUND_SOURCES[key])
            audio.preload = 'auto'
            audioBasesRef.current[key] = audio
        })

        void fetchPresets()
    }, [fetchPresets])

    const tocarSom = useCallback((key: SoundKey, options: SoundPlaybackOptions = {}) => {
        if (!somStatusRef.current) return
        const executar = () => {
            const baseAudio = audioBasesRef.current[key]
            if (!baseAudio) return
            const instancia = baseAudio.cloneNode(true) as HTMLAudioElement
            instancia.currentTime = 0
            instancia.volume = options.volume ?? 0.85
            instancia.playbackRate = options.playbackRate ?? 1
            void instancia.play().catch(() => { })
        }
        if (options.delayMs && options.delayMs > 0) window.setTimeout(executar, options.delayMs)
        else executar()
    }, [])

    const desbloquearAudio = useCallback(async () => {
        if (audioDesbloqueadoRef.current) return
        const preview = audioBasesRef.current.countdown
        if (!preview) return
        try {
            preview.currentTime = 0
            preview.volume = 0
            await preview.play()
            preview.pause()
            preview.currentTime = 0
            audioDesbloqueadoRef.current = true
        } catch { } // ignora 
    }, [])

    const tocarAvisoFinalRound = useCallback(() => { tocarSom('roundWarning'); tocarSom('roundWarning', { delayMs: 170 }) }, [tocarSom])
    const tocarAvisoProximoRound = useCallback(() => { tocarSom('nextRoundWarning', { playbackRate: 0.95 }); tocarSom('nextRoundWarning', { delayMs: 180, playbackRate: 1.1 }) }, [tocarSom])
    const tocarContagemFinal = useCallback(() => { tocarSom('countdown', { volume: 0.75 }) }, [tocarSom])
    const tocarTrocaFase = useCallback(() => { tocarSom('phaseChange') }, [tocarSom])
    const tocarFimTreino = useCallback(() => { tocarSom('finish', { volume: 0.9 }) }, [tocarSom])

    const prepararEstadoInicial = useCallback((cfg: TimerConfig) => {
        setFase('preparacao')
        faseRef.current = 'preparacao'
        setRoundAtual(1)
        roundRef.current = 1
        setDuracaoFaseAtual(cfg.preparacaoSegundos)
        setTempoRestante(cfg.preparacaoSegundos)
        tempoRestanteRef.current = cfg.preparacaoSegundos
        ultimoSegundoProcessadoRef.current = cfg.preparacaoSegundos
        deadlineRef.current = null
    }, [])

    const aplicarConfig = useCallback((next: TimerConfig) => {
        const cfg = normalizarConfig(next)
        setConfig(cfg)
        setConfigEdicao(cfg)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
        setAtivo(false)
        prepararEstadoInicial(cfg)
    }, [prepararEstadoInicial])

    useEffect(() => {
        const salvo = localStorage.getItem(STORAGE_KEY)
        const cfg = normalizarConfig(salvo ? JSON.parse(salvo) : DEFAULT_CONFIG)
        setConfig(cfg)
        setConfigEdicao(cfg)
        prepararEstadoInicial(cfg)
    }, [prepararEstadoInicial])

    const iniciarFase = useCallback((nextFase: FaseTimer, duracao: number, nextRound?: number) => {
        setFase(nextFase)
        faseRef.current = nextFase
        if (typeof nextRound === 'number') {
            setRoundAtual(nextRound)
            roundRef.current = nextRound
        }
        setDuracaoFaseAtual(duracao)
        setTempoRestante(duracao)
        tempoRestanteRef.current = duracao
        ultimoSegundoProcessadoRef.current = duracao
        deadlineRef.current = Date.now() + duracao * 1000
    }, [])

    const finalizarTreino = useCallback(() => {
        setAtivo(false)
        ativoRef.current = false
        if (intervaloRef.current) { clearInterval(intervaloRef.current); intervaloRef.current = null }
        deadlineRef.current = null
        setTempoRestante(0)
        tempoRestanteRef.current = 0
        tocarFimTreino()
    }, [tocarFimTreino])

    const avancarFase = useCallback(() => {
        const cfg = configRef.current
        const faseAtual = faseRef.current
        const round = roundRef.current

        if (faseAtual === 'preparacao') {
            tocarTrocaFase()
            iniciarFase('trabalho', cfg.trabalhoSegundos, 1)
            return
        }

        if (faseAtual === 'trabalho') {
            if (round >= cfg.rounds) { finalizarTreino(); return }
            tocarTrocaFase()
            iniciarFase('descanso', cfg.descansoSegundos)
            return
        }

        tocarTrocaFase()
        iniciarFase('trabalho', cfg.trabalhoSegundos, round + 1)
    }, [finalizarTreino, iniciarFase, tocarTrocaFase])

    const processarAvisos = useCallback((segundos: number, faseAtual: FaseTimer) => {
        if (!somStatusRef.current || segundos <= 0) return
        const cfg = configRef.current
        if (segundos <= 3) { tocarContagemFinal(); return }
        if (faseAtual === 'trabalho' && cfg.avisoFimSegundos > 0 && segundos === cfg.avisoFimSegundos) { tocarAvisoFinalRound(); return }
        if (faseAtual === 'descanso' && cfg.avisoProximoRoundSegundos > 0 && segundos === cfg.avisoProximoRoundSegundos) { tocarAvisoProximoRound() }
    }, [tocarAvisoFinalRound, tocarAvisoProximoRound, tocarContagemFinal])

    const atualizarRelogio = useCallback(() => {
        if (!ativoRef.current || deadlineRef.current === null) return
        const diferencaMs = deadlineRef.current - Date.now()
        const segundos = Math.max(0, Math.ceil(diferencaMs / 1000))

        if (segundos !== tempoRestanteRef.current) {
            setTempoRestante(segundos)
            tempoRestanteRef.current = segundos
            if (segundos !== ultimoSegundoProcessadoRef.current) {
                processarAvisos(segundos, faseRef.current)
                ultimoSegundoProcessadoRef.current = segundos
            }
        }
        if (diferencaMs <= 0) avancarFase()
    }, [avancarFase, processarAvisos])

    useEffect(() => {
        if (!ativo) {
            if (intervaloRef.current) { clearInterval(intervaloRef.current); intervaloRef.current = null }
            return
        }
        intervaloRef.current = setInterval(atualizarRelogio, 100)
        return () => { if (intervaloRef.current) { clearInterval(intervaloRef.current); intervaloRef.current = null } }
    }, [ativo, atualizarRelogio])

    const toggleAtivo = useCallback(() => {
        if (ativoRef.current) { setAtivo(false); return }
        if (somStatusRef.current) void desbloquearAudio()
        if (tempoRestanteRef.current <= 0) prepararEstadoInicial(configRef.current)
        deadlineRef.current = Date.now() + tempoRestanteRef.current * 1000
        ultimoSegundoProcessadoRef.current = tempoRestanteRef.current
        setAtivo(true)
    }, [desbloquearAudio, prepararEstadoInicial])

    const resetarTimer = useCallback((cfg: TimerConfig = configRef.current) => {
        setAtivo(false)
        if (intervaloRef.current) { clearInterval(intervaloRef.current); intervaloRef.current = null }
        prepararEstadoInicial(cfg)
    }, [prepararEstadoInicial])

    const aplicarPreset = useCallback((preset: TimerPreset) => {
        aplicarConfig(preset.config)
    }, [aplicarConfig])

    const cancelarEdicaoConfig = useCallback(() => {
        setConfigEdicao(configRef.current)
        setConfigAberto(false)
    }, [])

    const salvarEdicaoConfig = useCallback(async () => {
        if (nomePreset.trim()) {
            if (presetsDb.length >= 7) {
                toast.error('Limite máximo de 7 presets no sistema. Exclua algum caso queira adicionar outro.')
                return
            }

            const { error } = await supabase.from('timers_presets').insert({
                nome: nomePreset.trim(),
                rounds: configEdicao.rounds,
                trabalho_segundos: configEdicao.trabalhoSegundos,
                descanso_segundos: configEdicao.descansoSegundos,
                preparacao_segundos: configEdicao.preparacaoSegundos,
                aviso_fim_segundos: configEdicao.avisoFimSegundos,
                aviso_proximo_round_segundos: configEdicao.avisoProximoRoundSegundos
            })

            if (error) { toast.error('Erro ao conectar banco.'); return }
            toast.success('Novo Preset gravado na base!')
            fetchPresets()
        }

        aplicarConfig(configEdicao)
        setConfigAberto(false)
        setNomePreset('')
    }, [aplicarConfig, configEdicao, fetchPresets, nomePreset, presetsDb.length, supabase])

    const handleExcluirPreset = useCallback(async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation()
        if (!confirm(`Excluir permanentemente o timer ${name}?`)) return

        const { error } = await supabase.from('timers_presets').delete().eq('id', id)
        if (error) { toast.error('Falha ao excluir timer.'); return }

        toast.success('Timer excluído com sucesso.')
        fetchPresets()
    }, [fetchPresets, supabase])

    const progresso = useMemo(() => {
        const total = Math.max(1, duracaoFaseAtual)
        return clamp(((total - tempoRestante) / total) * 100, 0, 100)
    }, [duracaoFaseAtual, tempoRestante])

    const getFaseColorMode = () => {
        if (fase === 'preparacao') return 'text-amber-500 border-amber-500 stroke-amber-500'
        if (fase === 'trabalho') return 'text-green-600 border-green-600 stroke-green-600'
        return 'text-blue-500 border-blue-500 stroke-blue-500'
    }

    const getFaseBg = () => {
        if (fase === 'preparacao') return 'bg-amber-50'
        if (fase === 'trabalho') return 'bg-green-50'
        return 'bg-blue-50'
    }

    return (
        <div className="max-w-[1440px] mx-auto pb-12 animate-in slide-in-from-bottom-2 duration-300">
            {/* Header Clean Enterprise */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
                <div>
                    <button onClick={() => router.back()} className="group flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors w-fit mb-4">
                        <div className="bg-white border border-gray-200 p-1.5 rounded-md group-hover:border-gray-300 transition-colors shadow-sm">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        Voltar
                    </button>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Watch className="w-6 h-6 text-[#CC0000]" /> Timer de Treino
                    </h2>
                    <p className="text-sm font-medium text-gray-400 mt-1">
                        Use o cronômetro oficial do CT no desktop ou escolha um preset.
                    </p>
                </div>

                <div className="flex bg-white rounded-lg p-1.5 shadow-sm border border-gray-200 items-center">
                    <button
                        onClick={() => setSomStatus(prev => !prev)}
                        className={`p-2.5 rounded-md transition-all ${somStatus ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                        aria-label={somStatus ? 'Desativar som' : 'Ativar som'}
                    >
                        {somStatus ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-1.5" />
                    <button
                        onClick={() => { setConfigEdicao(configRef.current); setConfigAberto(true); }}
                        className="p-2.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all font-semibold text-sm flex items-center gap-2"
                    >
                        <Settings className="h-4 w-4 text-gray-400" /> Configuração Customizada
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Lateral Esq: Presets */}
                <div className="lg:col-span-1 space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                        <History className="w-4 h-4" /> Treinos Frequentes
                    </p>
                    {presetsDb.map(preset => (
                        <div
                            key={preset.id}
                            className="w-full relative bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-red-200 hover:bg-red-50/20 transition-all group shadow-sm flex items-center justify-between gap-3"
                        >
                            <button
                                onClick={() => aplicarPreset(preset)}
                                className="flex-1 text-left space-y-1 min-w-0"
                            >
                                <h4 className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors truncate">{preset.nome}</h4>
                                <p className="text-xs font-semibold text-gray-500">{preset.descricao}</p>
                            </button>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => aplicarPreset(preset)}
                                    className="p-2 text-gray-300 group-hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"
                                    title="Aplicar preset"
                                >
                                    <Play className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => handleExcluirPreset(e, preset.id, preset.nome)}
                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Excluir Preset"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lateral Dir: O Relógio (Samsung/Google Style Minimalist) */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center p-6 sm:p-10 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden relative min-h-[500px]">
                    <div className={`absolute inset-0 opacity-10 ${getFaseBg()} transition-colors duration-1000`} />

                    {/* Status Textos Cima */}
                    <div className="relative z-10 flex gap-10 mb-8 text-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                            <p className={`text-sm font-black uppercase tracking-wider ${getFaseColorMode()}`}>{fase === 'preparacao' ? 'Preparação' : fase === 'trabalho' ? 'Round ' + roundAtual : 'Descanso'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Rounds</p>
                            <p className="text-sm font-black text-gray-900 tracking-wider">
                                {roundAtual} <span className="text-gray-400 font-bold">/ {config.rounds}</span>
                            </p>
                        </div>
                    </div>

                    {/* Circular Timer Clean */}
                    <div className="relative z-10 w-72 h-72 sm:w-[360px] sm:h-[360px] flex items-center justify-center rounded-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-10">
                        {/* SVG Progress Ring */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                            {/* Circle Bg */}
                            <circle cx="50" cy="50" r="48" fill="none" className="stroke-gray-100" strokeWidth="2" />
                            {/* Circle Progress */}
                            <circle
                                cx="50" cy="50" r="48"
                                fill="none"
                                className={`transition-all duration-200 ease-linear ${getFaseColorMode().split(' ')[2]}`}
                                strokeWidth="3" strokeLinecap="round"
                                strokeDasharray="301.59" // 2 * pi * 48
                                strokeDashoffset={((100 - progresso) / 100) * 301.59}
                            />
                        </svg>

                        <div className="relative z-10 text-center flex flex-col items-center mt-2">
                            <span className="text-7xl sm:text-[100px] font-black tracking-tighter text-gray-900 tabular-nums leading-none">
                                {formatarTempo(tempoRestante)}
                            </span>
                        </div>
                    </div>

                    {/* Controls Clean Base */}
                    <div className="relative z-10 flex items-center gap-6">
                        <button
                            onClick={() => resetarTimer(configRef.current)}
                            className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-bold shadow-sm"
                        >
                            <Square fill="currentColor" className="w-5 h-5" />
                        </button>
                        <button
                            onClick={toggleAtivo}
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:-translate-y-1 ${ativo ? 'bg-gray-900 hover:bg-black' : 'bg-[#CC0000] hover:bg-[#AA0000] scale-105'}`}
                        >
                            {ativo ? <Pause fill="currentColor" className="w-8 h-8" /> : <Play fill="currentColor" className="w-8 h-8 ml-1" />}
                        </button>
                    </div>

                </div>
            </div>

            {/* Modal de Configuração Oculto / Clean Modal */}
            {configAberto && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={cancelarEdicaoConfig} />
                    <div className="w-full max-w-md animate-in zoom-in-95 bg-white rounded-3xl p-6 shadow-2xl relative z-10 border border-gray-100 space-y-5">
                        <div className="text-center mb-6">
                            <div className="mx-auto bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <Settings className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900">Customizar Timer</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nome do Preset (Opcional Salvar)</label>
                                <input
                                    value={nomePreset}
                                    onChange={e => setNomePreset(e.target.value)}
                                    placeholder="Ex: Treino Personalizado Sexta"
                                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl px-4 py-2.5 font-bold outline-none ring-red-500 focus:ring-2 focus:border-red-500 text-sm"
                                />
                            </div>
                            <div className="border-t border-gray-100 pt-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Rounds Totais</label>
                                <div className="flex bg-gray-100 rounded-xl overflow-hidden p-1">
                                    <button onClick={() => setConfigEdicao(prev => ({ ...prev, rounds: clamp(prev.rounds - 1, 1, 20) }))} className="w-10 bg-white shadow-sm font-bold text-gray-900 rounded-lg">-</button>
                                    <input value={configEdicao.rounds} readOnly className="flex-1 bg-transparent text-center font-black text-xl" />
                                    <button onClick={() => setConfigEdicao(prev => ({ ...prev, rounds: clamp(prev.rounds + 1, 1, 20) }))} className="w-10 bg-white shadow-sm font-bold text-gray-900 rounded-lg">+</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Trabalho (Min)</label>
                                    <select
                                        className="w-full cursor-pointer rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 font-bold outline-none ring-red-500 focus:ring-2 focus:border-red-500 text-sm"
                                        value={configEdicao.trabalhoSegundos}
                                        onChange={e => setConfigEdicao(prev => ({ ...prev, trabalhoSegundos: Number(e.target.value) }))}
                                    >
                                        {DURACOES_TRABALHO.map(valor => <option key={valor} value={valor}>{formatarMinSeg(valor)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Descanso</label>
                                    <select
                                        className="w-full cursor-pointer rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 font-bold outline-none ring-red-500 focus:ring-2 focus:border-red-500 text-sm"
                                        value={configEdicao.descansoSegundos}
                                        onChange={e => setConfigEdicao(prev => ({ ...prev, descansoSegundos: Number(e.target.value) }))}
                                    >
                                        {DURACOES_DESCANSO.map(valor => <option key={valor} value={valor}>{formatarMinSeg(valor)}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                            <button onClick={cancelarEdicaoConfig} className="py-2.5 px-4 font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button onClick={salvarEdicaoConfig} className="py-2.5 px-4 font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-sm transition-colors">{nomePreset ? 'Gravar Nova Matriz DB' : 'Apenas Aplicar Tempo'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
