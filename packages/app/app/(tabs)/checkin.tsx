import { Feather } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import BottomSheetModal from '@/components/BottomSheetModal'
import { useAuth } from '@/contexts/AuthContext'
import { buildEmptyAgendaData, fetchAgendaData, setPresencaStatus, type AgendaData } from '@/lib/appData'

function buildMonthDays(baseDateISO: string) {
    const baseDate = baseDateISO ? new Date(`${baseDateISO}T12:00:00`) : new Date()
    const year = baseDate.getFullYear()
    const month = baseDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekDay = firstDay.getDay()
    const totalDays = lastDay.getDate()
    const cells: Array<{ iso: string; day: number; empty: boolean }> = []

    for (let index = 0; index < startWeekDay; index += 1) {
        cells.push({ iso: `empty-${index}`, day: 0, empty: true })
    }

    for (let day = 1; day <= totalDays; day += 1) {
        const date = new Date(year, month, day)
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        cells.push({ iso, day, empty: false })
    }

    return {
        monthLabel: baseDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase(),
        yearLabel: String(year),
        cells,
    }
}

export default function CheckinScreen() {
    const { aluno } = useAuth()
    const insets = useSafeAreaInsets()
    const [agendaData, setAgendaData] = useState<AgendaData>(buildEmptyAgendaData)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [calendarVisible, setCalendarVisible] = useState(false)

    const loadAgenda = useCallback(async (selectedDateISO?: string, isRefresh = false) => {
        if (!aluno?.id) {
            setLoading(false)
            setRefreshing(false)
            setAgendaData(buildEmptyAgendaData())
            return
        }

        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            const next = await fetchAgendaData(aluno.id, selectedDateISO ?? agendaData.selectedDateISO)
            setAgendaData(next)
        } catch (error) {
            console.error('[Agenda] Erro ao carregar agenda:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [agendaData.selectedDateISO, aluno?.id])

    useEffect(() => {
        void loadAgenda()
    }, [loadAgenda])

    const handleSelectDay = useCallback(async (iso: string) => {
        await loadAgenda(iso)
    }, [loadAgenda])

    const handleRefresh = useCallback(async () => {
        await loadAgenda(agendaData.selectedDateISO, true)
    }, [agendaData.selectedDateISO, loadAgenda])

    const handlePresence = useCallback(async (aulaId: string, alreadyBooked: boolean) => {
        if (!aluno?.id || savingId) return
        const aula = agendaData.aulas.find((item) => item.id === aulaId)
        if (!aula) return

        if (!alreadyBooked && !aula.presenceActionEnabled) {
            Alert.alert('Confirmacao indisponivel', aula.presenceRestrictionMessage ?? 'Essa aula nao pode ser confirmada agora.')
            return
        }

        setSavingId(aulaId)
        try {
            await setPresencaStatus(aluno.id, aulaId, alreadyBooked ? 'cancelada' : 'agendado')
            await loadAgenda(agendaData.selectedDateISO)
        } catch (error) {
            console.error('[Agenda] Erro ao atualizar presenca:', error)
            Alert.alert(
                'Erro',
                error instanceof Error ? error.message : 'Nao foi possivel atualizar sua presenca.'
            )
        } finally {
            setSavingId(null)
        }
    }, [agendaData.aulas, agendaData.selectedDateISO, aluno?.id, loadAgenda, savingId])

    const calendarData = useMemo(
        () => buildMonthDays(agendaData.selectedDateISO || new Date().toISOString().slice(0, 10)),
        [agendaData.selectedDateISO]
    )

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <View
                style={{
                    borderBottomWidth: 1,
                    borderBottomColor: '#E2E8F0',
                    backgroundColor: '#FFFFFF',
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    paddingTop: insets.top + 12,
                }}
            >
                <View
                    style={{
                        marginBottom: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <View>
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: '800',
                                letterSpacing: 1.8,
                                color: '#94A3B8',
                                textTransform: 'uppercase',
                            }}
                        >
                            Aulas do CT
                        </Text>
                        <Text
                            style={{
                                marginTop: 8,
                                fontSize: 36,
                                fontWeight: '900',
                                color: '#0F172A',
                            }}
                        >
                            Agenda
                        </Text>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setCalendarVisible(true)}
                        style={{
                            height: 50,
                            width: 50,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 25,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            backgroundColor: '#F8FAFC',
                        }}
                    >
                        <Feather name="calendar" size={20} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 12 }}
                >
                    {agendaData.dias.map((dia) => {
                        const active = dia.iso === agendaData.selectedDateISO
                        return (
                            <Pressable
                                key={dia.iso}
                                onPress={() => handleSelectDay(dia.iso)}
                                style={({ pressed }) => ({
                                    marginRight: 12,
                                    width: 80,
                                    borderRadius: 22,
                                    borderWidth: 1,
                                    borderColor: active ? '#DC2626' : pressed ? '#F87171' : '#CBD5E1',
                                    backgroundColor: active ? '#DC2626' : pressed ? '#FEF2F2' : '#FFFFFF',
                                    paddingVertical: 14,
                                    paddingHorizontal: 12,
                                    shadowColor: active ? '#DC2626' : '#000000',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: active ? 0.18 : 0,
                                    shadowRadius: 18,
                                    elevation: active ? 5 : 0,
                                })}
                            >
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontWeight: '800',
                                        letterSpacing: 1.2,
                                        color: active ? '#FEE2E2' : '#94A3B8',
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {dia.shortLabel}
                                </Text>
                                <Text
                                    style={{
                                        marginTop: 6,
                                        fontSize: 28,
                                        fontWeight: '900',
                                        color: active ? '#FFFFFF' : '#94A3B8',
                                        textAlign: 'center',
                                    }}
                                >
                                    {dia.dayNumber}
                                </Text>
                                {dia.hasClasses && !active ? (
                                    <View
                                        style={{
                                            alignSelf: 'center',
                                            marginTop: 6,
                                            height: 6,
                                            width: 6,
                                            borderRadius: 999,
                                            backgroundColor: '#DC2626',
                                        }}
                                    />
                                ) : (
                                    <View style={{ marginTop: 12, height: 6 }} />
                                )}
                            </Pressable>
                        )
                    })}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleRefresh}
                    style={{
                        marginBottom: 20,
                        alignSelf: 'flex-end',
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                    }}
                >
                    {refreshing ? (
                        <ActivityIndicator color="#DC2626" />
                    ) : (
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: '800',
                                letterSpacing: 1.1,
                                color: '#0F172A',
                                textTransform: 'uppercase',
                            }}
                        >
                            Atualizar
                        </Text>
                    )}
                </TouchableOpacity>

                <Text style={{ marginBottom: 18, fontSize: 14, fontWeight: '700', color: '#64748B' }}>
                    {agendaData.selectedLabel || 'Carregando agenda...'}
                </Text>

                {loading ? (
                    <View
                        style={{
                            borderRadius: 28,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            backgroundColor: '#FFFFFF',
                            paddingVertical: 44,
                            alignItems: 'center',
                        }}
                    >
                        <ActivityIndicator color="#DC2626" />
                    </View>
                ) : agendaData.aulas.length === 0 ? (
                    <View
                        style={{
                            borderRadius: 28,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            backgroundColor: '#FFFFFF',
                            paddingVertical: 44,
                            paddingHorizontal: 24,
                            alignItems: 'center',
                        }}
                    >
                        <Feather name="calendar" size={34} color="#CBD5E1" />
                        <Text
                            style={{
                                marginTop: 18,
                                fontSize: 18,
                                fontWeight: '800',
                                color: '#0F172A',
                            }}
                        >
                            Nenhuma aula nessa data
                        </Text>
                        <Text
                            style={{
                                marginTop: 8,
                                textAlign: 'center',
                                fontSize: 14,
                                lineHeight: 20,
                                color: '#64748B',
                            }}
                        >
                            Selecione outro dia na faixa acima ou use o calendario para escolher outra data.
                        </Text>
                    </View>
                ) : (
                    agendaData.aulas.map((aula) => {
                        const isBooked = Boolean(aula.agendado || aula.presente)
                        const isFull = aula.confirmationState === 'full'
                        const actionDisabled = savingId === aula.id

                        return (
                            <Pressable
                                key={aula.id}
                                style={({ pressed }) => ({
                                    marginBottom: 16,
                                    borderRadius: 30,
                                    borderWidth: 1,
                                    borderColor: pressed ? '#F87171' : '#E2E8F0',
                                    backgroundColor: pressed ? '#FFF5F5' : '#FFFFFF',
                                    padding: 22,
                                })}
                            >
                                <View
                                    style={{
                                        marginBottom: 18,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <View>
                                        <Text style={{ fontSize: 34, fontWeight: '900', color: '#0F172A' }}>
                                            {aula.horario}
                                        </Text>
                                        <Text
                                            style={{
                                                marginTop: 2,
                                                fontSize: 12,
                                                fontWeight: '800',
                                                letterSpacing: 1.4,
                                                color: '#94A3B8',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            60 min
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            borderRadius: 14,
                                            backgroundColor: isBooked
                                                ? '#DCFCE7'
                                                : isFull
                                                    ? '#F1F5F9'
                                                    : '#FEE2E2',
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 10,
                                                fontWeight: '900',
                                                letterSpacing: 1.2,
                                                color: isBooked ? '#166534' : isFull ? '#64748B' : aula.presenceStatusLabel === 'Indisponivel' ? '#475569' : '#DC2626',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {aula.presenceStatusLabel ?? (isBooked ? 'Confirmada' : isFull ? 'Lotada' : 'Disponivel')}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>
                                    {aula.nome}
                                </Text>
                                <Text style={{ marginTop: 6, fontSize: 15, fontWeight: '600', color: '#64748B' }}>
                                    {aula.professor}
                                </Text>

                                <View style={{ marginTop: 18 }}>
                                    <View
                                        style={{
                                            marginBottom: 8,
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8' }}>
                                            {aula.vagas_ocupadas}/{aula.vagas_total} alunos
                                        </Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8' }}>
                                            {Math.max(aula.vagas_total - aula.vagas_ocupadas, 0)} vagas
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            height: 10,
                                            borderRadius: 999,
                                            backgroundColor: '#E2E8F0',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: `${Math.min(
                                                    (aula.vagas_total > 0
                                                        ? (aula.vagas_ocupadas / aula.vagas_total) * 100
                                                        : 0),
                                                    100
                                                )}%`,
                                                height: '100%',
                                                borderRadius: 999,
                                                backgroundColor: isFull ? '#94A3B8' : '#10B981',
                                            }}
                                        />
                                    </View>
                                </View>

                                <Pressable
                                    disabled={actionDisabled}
                                    onPress={() => handlePresence(aula.id, isBooked)}
                                    style={({ pressed }) => ({
                                        marginTop: 20,
                                        borderRadius: 18,
                                        backgroundColor: isBooked
                                            ? '#22C55E'
                                            : aula.presenceActionEnabled
                                                ? '#DC2626'
                                                : '#E2E8F0',
                                        opacity: actionDisabled ? 0.7 : 1,
                                        paddingVertical: 16,
                                        alignItems: 'center',
                                        transform: [{ scale: pressed && !actionDisabled ? 0.985 : 1 }],
                                    })}
                                >
                                    {actionDisabled ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                            {isBooked ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
                                            <Text
                                                style={{
                                                    marginLeft: isBooked ? 8 : 0,
                                                    fontSize: 12,
                                                    fontWeight: '900',
                                                    letterSpacing: 1.4,
                                                    color: aula.presenceActionEnabled || isBooked ? '#FFFFFF' : '#475569',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {isBooked
                                                    ? 'Presenca confirmada'
                                                    : aula.presenceActionLabel ?? (isFull ? 'Sem vagas' : 'Confirmar presenca')}
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>
                            </Pressable>
                        )
                    })
                )}
            </ScrollView>

            <BottomSheetModal visible={calendarVisible} onClose={() => setCalendarVisible(false)}>
                <View style={{ paddingHorizontal: 24 }}>
                    <Text style={{ fontSize: 36, fontWeight: '900', color: '#0F172A' }}>
                        {calendarData.monthLabel}
                    </Text>
                    <Text
                        style={{
                            marginTop: 6,
                            fontSize: 18,
                            fontWeight: '700',
                            color: '#94A3B8',
                        }}
                    >
                        {calendarData.yearLabel}
                    </Text>

                    <View
                        style={{
                            marginTop: 28,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }}
                    >
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, index) => (
                            <Text
                                key={`${label}-${index}`}
                                style={{
                                    width: 40,
                                    textAlign: 'center',
                                    fontSize: 12,
                                    fontWeight: '800',
                                    color: '#94A3B8',
                                }}
                            >
                                {label}
                            </Text>
                        ))}
                    </View>

                    <View
                        style={{
                            marginTop: 18,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 10,
                        }}
                    >
                        {calendarData.cells.map((cell) => {
                            if (cell.empty) {
                                return <View key={cell.iso} style={{ height: 42, width: 42 }} />
                            }

                            const active = cell.iso === agendaData.selectedDateISO
                            const hasClasses = agendaData.dias.some((dia) => dia.iso === cell.iso && dia.hasClasses)

                            return (
                                <TouchableOpacity
                                    key={cell.iso}
                                    activeOpacity={0.85}
                                    onPress={async () => {
                                        setCalendarVisible(false)
                                        await handleSelectDay(cell.iso)
                                    }}
                                    style={{
                                        height: 42,
                                        width: 42,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 14,
                                        backgroundColor: active ? '#0A0F1D' : '#FFFFFF',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            fontWeight: '800',
                                            color: active ? '#FFFFFF' : '#0F172A',
                                        }}
                                    >
                                        {cell.day}
                                    </Text>
                                    {hasClasses && !active ? (
                                        <View
                                            style={{
                                                position: 'absolute',
                                                bottom: 3,
                                                height: 4,
                                                width: 4,
                                                borderRadius: 999,
                                                backgroundColor: '#DC2626',
                                            }}
                                        />
                                    ) : null}
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setCalendarVisible(false)}
                        style={{
                            marginTop: 28,
                            marginBottom: 8,
                            borderRadius: 18,
                            backgroundColor: '#F1F5F9',
                            paddingVertical: 18,
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: '900',
                                letterSpacing: 1.4,
                                color: '#475569',
                                textTransform: 'uppercase',
                            }}
                        >
                            Fechar
                        </Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetModal>
        </View>
    )
}
