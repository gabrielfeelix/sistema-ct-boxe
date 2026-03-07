import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { fetchHistoricoData, type HistoricoData } from '@/lib/appData'

const DAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function buildMonthOptions() {
    const today = new Date()
    return Array.from({ length: 5 }, (_, index) => {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - (4 - index), 1)
        return monthDate
    })
}

function buildCalendarWeeks(monthDate: Date) {
    const firstDayIndex = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay()
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

    const days: Array<number | null> = []
    for (let i = 0; i < firstDayIndex; i += 1) days.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) days.push(day)
    while (days.length % 7 !== 0) days.push(null)

    const weeks: Array<Array<number | null>> = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }

    return weeks
}

function buildEmptyHistorico(monthLabel: string): HistoricoData {
    return {
        mesLabel: monthLabel,
        resumo: {
            mes: 0,
            sequencia: 0,
            total: 0,
        },
        diasComPresenca: [],
        presencasLista: [],
    }
}

function createShadow(color: string, opacity: number, radius: number, elevation: number) {
    return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation,
    }
}

export default function HistoricoScreen() {
    const { aluno } = useAuth()
    const monthOptions = useMemo(buildMonthOptions, [])
    const [mesAtualIndex, setMesAtualIndex] = useState(monthOptions.length - 1)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [historico, setHistorico] = useState<HistoricoData>(
        buildEmptyHistorico(
            monthOptions[monthOptions.length - 1].toLocaleDateString('pt-BR', {
                month: 'short',
                year: 'numeric',
            })
        )
    )
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)

    const selectedMonth = monthOptions[mesAtualIndex]
    const weeks = useMemo(() => buildCalendarWeeks(selectedMonth), [selectedMonth])

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setLoading(false)
            return
        }

        try {
            const yearStr = selectedMonth.getFullYear()
            const monthStr = (selectedMonth.getMonth() + 1).toString().padStart(2, '0')
            const filterStr = `${yearStr}-${monthStr}`
            const data = await fetchHistoricoData(aluno.id, filterStr)
            setHistorico(data)
        } catch (error) {
            console.error('[Historico] Erro ao carregar historico:', error)
        } finally {
            setLoading(false)
        }
    }, [aluno?.id, selectedMonth])

    useEffect(() => {
        void loadData()
    }, [loadData])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }, [loadData])

    const handlePrevMonth = () => {
        if (mesAtualIndex > 0) {
            setMesAtualIndex((prev) => prev - 1)
            setDiaSelecionado(null)
        }
    }

    const handleNextMonth = () => {
        if (mesAtualIndex < monthOptions.length - 1) {
            setMesAtualIndex((prev) => prev + 1)
            setDiaSelecionado(null)
        }
    }

    const today = new Date()
    const isCurrentMonth =
        selectedMonth.getMonth() === today.getMonth() &&
        selectedMonth.getFullYear() === today.getFullYear()

    return (
        <View style={{ flex: 1, backgroundColor: '#FDFDFD' }}>
            <View
                style={{
                    zIndex: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E2E8F0',
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 24,
                    paddingTop: 48,
                    paddingBottom: 24,
                }}
            >
                <Text
                    style={{
                        marginBottom: 4,
                        fontSize: 12,
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        color: '#64748B',
                    }}
                >
                    Estatisticas
                </Text>
                <Text style={{ fontSize: 36, fontWeight: '900', letterSpacing: -1, color: '#0F172A' }}>
                    Historico
                </Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
                    <View
                        style={{
                            marginBottom: 28,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            gap: 12,
                        }}
                    >
                        <View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                backgroundColor: '#FFFFFF',
                                paddingVertical: 20,
                                paddingHorizontal: 12,
                                ...createShadow('#CBD5E1', 0.18, 12, 3),
                            }}
                        >
                            <View
                                style={{
                                    marginBottom: 12,
                                    height: 32,
                                    width: 32,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 16,
                                    backgroundColor: '#F8FAFC',
                                }}
                            >
                                <Feather name="calendar" size={14} color="#64748B" />
                            </View>
                            <Text style={{ fontSize: 30, fontWeight: '900', color: '#CC0000' }}>
                                {historico.resumo.mes}
                            </Text>
                            <Text
                                style={{
                                    marginTop: 6,
                                    fontSize: 10,
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.6,
                                    color: '#94A3B8',
                                }}
                            >
                                Neste mes
                            </Text>
                        </View>

                        <View
                            style={{
                                flex: 1.2,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                borderRadius: 24,
                                backgroundColor: '#0F172A',
                                paddingVertical: 20,
                                paddingHorizontal: 12,
                                ...createShadow('#0F172A', 0.25, 16, 6),
                            }}
                        >
                            <View style={{ position: 'absolute', right: -16, top: -12, opacity: 0.12 }}>
                                <FontAwesome5 name="fire" size={60} color="#FFFFFF" />
                            </View>
                            <View
                                style={{
                                    marginBottom: 12,
                                    height: 32,
                                    width: 32,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 16,
                                    backgroundColor: 'rgba(255,255,255,0.12)',
                                }}
                            >
                                <FontAwesome5 name="fire" size={14} color="#FFFFFF" />
                            </View>
                            <Text style={{ fontSize: 30, fontWeight: '900', color: '#FFFFFF' }}>
                                {historico.resumo.sequencia}
                            </Text>
                            <Text
                                style={{
                                    marginTop: 6,
                                    fontSize: 10,
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.6,
                                    color: '#CBD5E1',
                                }}
                            >
                                Sequencia
                            </Text>
                        </View>

                        <View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                backgroundColor: '#FFFFFF',
                                paddingVertical: 20,
                                paddingHorizontal: 12,
                                ...createShadow('#CBD5E1', 0.18, 12, 3),
                            }}
                        >
                            <View
                                style={{
                                    marginBottom: 12,
                                    height: 32,
                                    width: 32,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 16,
                                    backgroundColor: '#F8FAFC',
                                }}
                            >
                                <Feather name="activity" size={14} color="#64748B" />
                            </View>
                            <Text style={{ fontSize: 30, fontWeight: '900', color: '#CC0000' }}>
                                {historico.resumo.total}
                            </Text>
                            <Text
                                style={{
                                    marginTop: 6,
                                    fontSize: 10,
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.6,
                                    color: '#94A3B8',
                                }}
                            >
                                Total
                            </Text>
                        </View>
                    </View>

                    <View
                        style={{
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            borderWidth: 1,
                            borderBottomWidth: 0,
                            borderColor: '#E2E8F0',
                            backgroundColor: '#FFFFFF',
                            padding: 8,
                            ...createShadow('#CBD5E1', 0.12, 8, 2),
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                disabled={mesAtualIndex === 0}
                                onPress={handlePrevMonth}
                                style={{
                                    height: 48,
                                    width: 48,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 14,
                                    backgroundColor: '#F8FAFC',
                                    opacity: mesAtualIndex === 0 ? 0.4 : 1,
                                }}
                            >
                                <Feather name="chevron-left" size={20} color="#64748B" />
                            </TouchableOpacity>

                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    color: '#0F172A',
                                }}
                            >
                                {historico.mesLabel}
                            </Text>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                disabled={mesAtualIndex === monthOptions.length - 1}
                                onPress={handleNextMonth}
                                style={{
                                    height: 48,
                                    width: 48,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 14,
                                    backgroundColor: '#F8FAFC',
                                    opacity: mesAtualIndex === monthOptions.length - 1 ? 0.4 : 1,
                                }}
                            >
                                <Feather name="chevron-right" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View
                        style={{
                            marginBottom: 28,
                            overflow: 'hidden',
                            borderRadius: 20,
                            borderTopLeftRadius: 0,
                            borderTopRightRadius: 0,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            backgroundColor: '#FFFFFF',
                            ...createShadow('#CBD5E1', 0.18, 12, 3),
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                borderBottomWidth: 1,
                                borderBottomColor: '#E2E8F0',
                                backgroundColor: '#F8FAFC',
                            }}
                        >
                            {DAY_HEADERS.map((day) => (
                                <View key={day} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            fontWeight: '900',
                                            textTransform: 'uppercase',
                                            letterSpacing: 1.5,
                                            color: '#94A3B8',
                                        }}
                                    >
                                        {day}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View style={{ padding: 16, paddingBottom: 20 }}>
                            {weeks.map((semana, indexSemana) => (
                                <View key={`week-${indexSemana}`} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                    {semana.map((dia, indexDia) => {
                                        const hasPresenca = dia ? historico.diasComPresenca.includes(dia) : false
                                        const isHoje = Boolean(dia && isCurrentMonth && dia === today.getDate())
                                        const isSelected = diaSelecionado === dia

                                        return (
                                            <TouchableOpacity
                                                key={dia ?? `empty-${indexSemana}-${indexDia}`}
                                                disabled={!dia}
                                                activeOpacity={0.75}
                                                onPress={() => {
                                                    if (dia) setDiaSelecionado(dia)
                                                }}
                                                style={{
                                                    position: 'relative',
                                                    flex: 1,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    paddingHorizontal: 4,
                                                }}
                                            >
                                                {dia ? (
                                                    <View
                                                        style={{
                                                            height: 40,
                                                            width: 40,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: 999,
                                                            backgroundColor: isSelected
                                                                ? '#CC0000'
                                                                : hasPresenca
                                                                  ? '#FEF2F2'
                                                                  : '#FFFFFF',
                                                            borderWidth: isSelected
                                                                ? 0
                                                                : isHoje && !hasPresenca
                                                                  ? 2
                                                                  : hasPresenca
                                                                    ? 1
                                                                    : 0,
                                                            borderColor: isHoje && !hasPresenca ? '#0F172A' : '#FECACA',
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 16,
                                                                fontWeight: '700',
                                                                color: isSelected
                                                                    ? '#FFFFFF'
                                                                    : hasPresenca
                                                                      ? '#CC0000'
                                                                      : isHoje
                                                                        ? '#0F172A'
                                                                        : '#475569',
                                                            }}
                                                        >
                                                            {dia}
                                                        </Text>
                                                        {hasPresenca && !isSelected ? (
                                                            <View
                                                                style={{
                                                                    position: 'absolute',
                                                                    bottom: 6,
                                                                    height: 6,
                                                                    width: 6,
                                                                    borderRadius: 999,
                                                                    backgroundColor: '#CC0000',
                                                                }}
                                                            />
                                                        ) : null}
                                                    </View>
                                                ) : null}
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            ))}
                        </View>
                    </View>

                    <View>
                        <Text style={{ marginBottom: 20, fontSize: 22, fontWeight: '800', color: '#0F172A' }}>
                            Aulas concluidas
                        </Text>

                        {loading ? (
                            <View
                                style={{
                                    borderRadius: 24,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    backgroundColor: '#FFFFFF',
                                    padding: 24,
                                }}
                            >
                                <Text style={{ fontSize: 14, color: '#64748B' }}>Carregando historico...</Text>
                            </View>
                        ) : historico.presencasLista.length > 0 ? (
                            <View
                                style={{
                                    borderRadius: 24,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    backgroundColor: '#FFFFFF',
                                    padding: 8,
                                    ...createShadow('#CBD5E1', 0.18, 12, 3),
                                }}
                            >
                                {historico.presencasLista.map((presenca, index) => (
                                    <View
                                        key={presenca.id}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 16,
                                            borderBottomWidth:
                                                index !== historico.presencasLista.length - 1 ? 1 : 0,
                                            borderBottomColor: '#F1F5F9',
                                        }}
                                    >
                                        <View
                                            style={{
                                                marginRight: 20,
                                                height: 48,
                                                width: 48,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: 24,
                                                borderWidth: 1,
                                                borderColor: '#BBF7D0',
                                                backgroundColor: '#ECFDF5',
                                            }}
                                        >
                                            <Feather name="check" size={18} color="#10B981" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{
                                                    marginBottom: 4,
                                                    fontSize: 18,
                                                    fontWeight: '800',
                                                    color: '#0F172A',
                                                }}
                                            >
                                                {presenca.aula}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Feather name="clock" size={12} color="#94A3B8" />
                                                <Text
                                                    style={{
                                                        marginLeft: 8,
                                                        fontSize: 12,
                                                        fontWeight: '800',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: 1.2,
                                                        color: '#64748B',
                                                    }}
                                                >
                                                    {presenca.data}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View
                                style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 24,
                                    borderWidth: 1,
                                    borderStyle: 'dashed',
                                    borderColor: '#E2E8F0',
                                    backgroundColor: '#FFFFFF',
                                    paddingHorizontal: 32,
                                    paddingVertical: 56,
                                }}
                            >
                                <View
                                    style={{
                                        marginBottom: 24,
                                        height: 80,
                                        width: 80,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 40,
                                        backgroundColor: '#F8FAFC',
                                    }}
                                >
                                    <Feather name="inbox" size={32} color="#CBD5E1" />
                                </View>
                                <Text
                                    style={{
                                        textAlign: 'center',
                                        fontSize: 18,
                                        fontWeight: '800',
                                        lineHeight: 26,
                                        color: '#94A3B8',
                                    }}
                                >
                                    Nenhuma presenca neste mes
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}
