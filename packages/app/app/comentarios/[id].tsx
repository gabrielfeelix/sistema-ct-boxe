import { Feather } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { fetchSinglePost, toggleFeedLike } from '@/lib/appData'
import type { FeedPost } from '@/lib/types'

export default function ComentariosModal() {
    const { id } = useLocalSearchParams<{ id?: string }>()
    const router = useRouter()
    const { aluno } = useAuth()

    const [post, setPost] = useState<FeedPost | null>(null)
    const [loading, setLoading] = useState(true)
    const [comentarioTexto, setComentarioTexto] = useState('')
    const [saving, setSaving] = useState(false)

    const loadData = useCallback(async () => {
        if (!aluno?.id || !id) return
        const found = await fetchSinglePost(aluno.id, id)
        setPost(found)
        setLoading(false)
    }, [aluno?.id, id])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleSendComentario = async () => {
        if (!comentarioTexto.trim() || saving || !post || !aluno) return

        setSaving(true)
        // Aqui simularíamos o envio à API, por enquanto local.
        setTimeout(() => {
            setPost(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    comentarios: [
                        ...prev.comentarios,
                        {
                            id: Math.random().toString(),
                            autor: aluno.nome || 'Eu',
                            iniciais: aluno.nome ? aluno.nome.charAt(0).toUpperCase() : 'E',
                            data: 'Agora',
                            texto: comentarioTexto.trim(),
                        }
                    ]
                }
            })
            setComentarioTexto('')
            setSaving(false)
        }, 500)
    }

    if (loading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <Text className="text-slate-500">Carregando comentários...</Text>
            </View>
        )
    }

    if (!post) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <Text className="text-slate-500">Post não encontrado.</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 p-2">
                    <Text className="text-[#CC0000] font-bold">Voltar</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <View className="z-10 flex-row items-center justify-between border-b border-slate-100 bg-white px-6 pb-4 pt-16">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.back()}
                        className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
                    >
                        <Feather name="arrow-left" size={18} color="#0F172A" />
                    </TouchableOpacity>
                    <Text className="text-xl font-black tracking-tight text-slate-900">Comentários</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-4">
                {post.comentarios.length === 0 ? (
                    <View className="py-20 items-center">
                        <Feather name="message-square" size={40} color="#CBD5E1" />
                        <Text className="mt-4 text-slate-500 font-medium">Nenhum comentário ainda.</Text>
                        <Text className="text-slate-400 text-sm mt-1">Seja o primeiro a comentar!</Text>
                    </View>
                ) : (
                    post.comentarios.map((comentario) => (
                        <View key={comentario.id} className="mb-4 flex-row items-start">
                            <View className="mr-3 mt-1 h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                <Text className="text-xs font-bold text-slate-600">
                                    {comentario.autor.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View className="flex-1 rounded-2xl rounded-tl-none bg-slate-50 px-4 py-3 border border-slate-100">
                                <Text className="font-bold text-slate-900 mb-1">{comentario.autor}</Text>
                                <Text className="text-sm font-medium text-slate-700 leading-relaxed">
                                    {comentario.texto}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <View className="border-t border-slate-100 bg-white px-6 py-4 pb-8">
                <View className="flex-row items-center rounded-full border border-slate-200 bg-slate-50 pl-4 pr-1">
                    <TextInput
                        className="flex-1 h-12 text-base font-medium text-slate-900"
                        placeholder="Adicione um comentário..."
                        placeholderTextColor="#94A3B8"
                        value={comentarioTexto}
                        onChangeText={setComentarioTexto}
                        multiline
                    />
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleSendComentario}
                        disabled={!comentarioTexto.trim() || saving}
                        className={`h-10 w-10 items-center justify-center rounded-full ml-2 ${comentarioTexto.trim() && !saving ? 'bg-[#CC0000]' : 'bg-slate-200'
                            }`}
                    >
                        {saving ? (
                            <Text className="text-white font-bold text-xs">...</Text>
                        ) : (
                            <Feather name="send" size={16} color="white" style={{ marginLeft: -2 }} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    )
}
