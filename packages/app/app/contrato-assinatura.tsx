import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { assinarDocumento, fetchDocumentoAluno } from '@/lib/appData'
import type { DocumentoAluno } from '@/lib/types'

const TERMS = [
    'Li e concordo com os termos de saude e responsabilidade fisica.',
    'Estou ciente do uso de imagens institucionais do torneio.',
]

function fallbackTexto() {
    return [
        'Declaro estar apto fisicamente e mentalmente a participar deste evento.',
        'Concordo com os termos de uso de imagem para fins institucionais do CT.',
    ].join('\n\n')
}

export default function ContratoAssinaturaScreen() {
    const router = useRouter()
    const { id } = useLocalSearchParams<{ id?: string }>()

    const [documento, setDocumento] = useState<DocumentoAluno | null>(null)
    const [loading, setLoading] = useState(true)
    const [aceito1, setAceito1] = useState(false)
    const [aceito2, setAceito2] = useState(false)
    const [saving, setSaving] = useState(false)

    const isAllAccepted = aceito1 && aceito2

    const loadData = useCallback(async () => {
        if (!id) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const data = await fetchDocumentoAluno(id)
            setDocumento(data)
        } catch (error) {
            console.error('[ContratoAssinatura] Erro ao carregar documento:', error)
            setDocumento(null)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        loadData()
    }, [loadData])

    const conteudo = useMemo(() => documento?.texto?.trim() || fallbackTexto(), [documento?.texto])

    const handleAssinar = async () => {
        if (!id || !isAllAccepted || saving) return

        setSaving(true)
        await assinarDocumento(id)
        setSaving(false)

        Alert.alert('Sucesso', 'Contrato assinado digitalmente com sucesso.', [
            { text: 'Ir para contratos', onPress: () => router.replace('/contratos') },
        ])
    }

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 w-full flex-row items-center border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/30">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
                >
                    <Feather name="arrow-left" size={18} color="#0F172A" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Passaporte</Text>
                    <Text className="text-2xl font-black tracking-tight text-slate-900" numberOfLines={1}>
                        Termo de Ciencia
                    </Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="px-6 pt-8">
                    {loading ? (
                        <View className="items-center justify-center rounded-3xl border border-slate-100 bg-white py-16">
                            <Text className="text-sm font-medium text-slate-500">Carregando documento...</Text>
                        </View>
                    ) : !documento ? (
                        <View className="items-center justify-center rounded-3xl border border-slate-100 bg-white py-16">
                            <Feather name="file-minus" size={36} color="#CBD5E1" />
                            <Text className="mt-4 text-base font-bold text-slate-500">Documento nao encontrado</Text>
                        </View>
                    ) : (
                        <>
                            <View className="relative mb-8 overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-xl shadow-slate-900/20">
                                <View className="absolute -right-6 -top-6 opacity-10">
                                    <FontAwesome5 name="file-signature" size={120} color="#FFFFFF" />
                                </View>
                                <View className="mb-6 h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10">
                                    <Feather name="file-text" size={20} color="#FFFFFF" />
                                </View>
                                <Text className="mb-2 text-2xl font-black leading-tight tracking-tight text-white">
                                    {documento.titulo}
                                </Text>
                                <Text className="text-sm font-medium leading-relaxed text-slate-400">
                                    Revise os termos abaixo antes de assinar digitalmente.
                                </Text>
                            </View>

                            <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Leitura Obrigatoria</Text>
                            <View className="mb-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-200/50">
                                <Text className="text-sm leading-loose text-slate-500">{conteudo}</Text>
                            </View>

                            <Text className="mb-4 text-lg font-bold tracking-tight text-slate-900">Confirmacoes</Text>
                            <View className="mb-10 space-y-4">
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setAceito1((prev) => !prev)}
                                    className={`mb-3 flex-row items-center rounded-2xl border p-4 ${
                                        aceito1
                                            ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-500/20'
                                            : 'border-slate-200 bg-white shadow-sm shadow-slate-200/30'
                                    }`}
                                >
                                    <View
                                        className={`mr-4 h-6 w-6 items-center justify-center rounded-md border ${
                                            aceito1 ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-50'
                                        }`}
                                    >
                                        {aceito1 && <Feather name="check" size={14} color="white" />}
                                    </View>
                                    <Text className={`flex-1 text-sm font-bold ${aceito1 ? 'text-emerald-900' : 'text-slate-600'}`}>
                                        {TERMS[0]}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setAceito2((prev) => !prev)}
                                    className={`flex-row items-center rounded-2xl border p-4 ${
                                        aceito2
                                            ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-500/20'
                                            : 'border-slate-200 bg-white shadow-sm shadow-slate-200/30'
                                    }`}
                                >
                                    <View
                                        className={`mr-4 h-6 w-6 items-center justify-center rounded-md border ${
                                            aceito2 ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-50'
                                        }`}
                                    >
                                        {aceito2 && <Feather name="check" size={14} color="white" />}
                                    </View>
                                    <Text className={`flex-1 text-sm font-bold ${aceito2 ? 'text-emerald-900' : 'text-slate-600'}`}>
                                        {TERMS[1]}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View className="mt-2 items-center border-t border-slate-100 pb-8 pt-8">
                                <Text className="mb-6 text-sm font-bold tracking-tight text-slate-900">
                                    Assinatura Biometrica Requerida
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    disabled={!isAllAccepted || saving}
                                    onPress={handleAssinar}
                                    className={`h-28 w-28 items-center justify-center rounded-[2.5rem] border-4 shadow-lg ${
                                        isAllAccepted && !saving
                                            ? 'border-[#CC0000] bg-slate-900 shadow-[#CC0000]/20'
                                            : 'border-slate-100 bg-slate-50 shadow-slate-200/50'
                                    }`}
                                >
                                    <FontAwesome5
                                        name="fingerprint"
                                        size={56}
                                        color={isAllAccepted && !saving ? '#CC0000' : '#CBD5E1'}
                                    />
                                </TouchableOpacity>

                                <Text
                                    className={`mt-6 text-[10px] font-black uppercase tracking-widest ${
                                        isAllAccepted ? 'text-[#CC0000]' : 'text-slate-400'
                                    }`}
                                >
                                    {saving
                                        ? 'Assinando...'
                                        : isAllAccepted
                                          ? 'Toque na digital para assinar'
                                          : 'Aceite os termos primeiro'}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    )
}
