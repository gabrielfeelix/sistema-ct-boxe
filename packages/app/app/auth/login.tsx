import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useState } from 'react'
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
    const { signIn } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({ email: '', password: '' })

    const handleLogin = async () => {
        let hasError = false
        const newErrors = { email: '', password: '' }

        if (!email.trim()) {
            newErrors.email = 'E-mail obrigatorio'
            hasError = true
        }
        if (!password.trim()) {
            newErrors.password = 'Senha obrigatoria'
            hasError = true
        }

        setErrors(newErrors)

        if (hasError) return

        setLoading(true)
        const result = await signIn(email, password)
        setLoading(false)

        if (result.error) {
            Alert.alert('Falha no login', 'E-mail ou senha invalidos.')
            return
        }

        // Deixa o guard global redirecionar quando sessao + perfil estiverem sincronizados
    }

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Recuperar senha', 'Informe seu e-mail para receber o link de recuperacao.')
            return
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
        if (error) {
            Alert.alert('Erro', 'Nao foi possivel enviar o link de recuperacao.')
            return
        }
        Alert.alert('Recuperar senha', 'Um link de recuperacao foi enviado para seu e-mail.')
    }

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="relative flex-1 justify-center px-8">
                        <View className="absolute -right-20 top-10 opacity-5">
                            <FontAwesome5 name="fire" size={300} color="#0F172A" />
                        </View>

                        <View className="mb-16 items-center">
                            <View className="mb-8 h-20 w-20 items-center justify-center rounded-[1.5rem] bg-slate-900 shadow-2xl shadow-slate-900/20">
                                <Text className="text-3xl font-black tracking-tighter text-white">CT</Text>
                            </View>
                            <Text className="text-center text-4xl font-black tracking-tight text-slate-900">
                                Argel Riboli
                            </Text>
                            <Text className="mt-2 text-center text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                                Centro de Treinamento
                            </Text>
                        </View>

                        <View className="space-y-6">
                            <View className="mb-5">
                                <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                                    Usuario / Email
                                </Text>
                                <View
                                    className={`h-16 flex-row items-center rounded-2xl border-[1.5px] bg-white px-5 shadow-sm shadow-slate-200/50 ${
                                        errors.email ? 'border-red-500 bg-red-50/50' : 'border-slate-100'
                                    }`}
                                >
                                    <Feather name="mail" size={18} color={errors.email ? '#CC0000' : '#94A3B8'} />
                                    <TextInput
                                        className="ml-3 h-full flex-1 text-base font-medium text-slate-900"
                                        placeholder="E-mail de acesso"
                                        placeholderTextColor="#CBD5E1"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text)
                                            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                                        }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                                {errors.email ? (
                                    <Text className="ml-2 mt-2 text-xs font-black uppercase tracking-wide text-red-500">
                                        {errors.email}
                                    </Text>
                                ) : null}
                            </View>

                            <View className="mb-10">
                                <View className="mb-2 flex-row items-center justify-between px-1">
                                    <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                        Senha
                                    </Text>
                                    <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.6}>
                                        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            Esqueci a senha
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View
                                    className={`h-16 flex-row items-center rounded-2xl border-[1.5px] bg-white px-5 shadow-sm shadow-slate-200/50 ${
                                        errors.password ? 'border-red-500 bg-red-50/50' : 'border-slate-100'
                                    }`}
                                >
                                    <Feather
                                        name="lock"
                                        size={18}
                                        color={errors.password ? '#CC0000' : '#94A3B8'}
                                    />
                                    <TextInput
                                        className="ml-3 h-full flex-1 text-base font-medium text-slate-900"
                                        placeholder="Sua senha secreta"
                                        placeholderTextColor="#CBD5E1"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text)
                                            if (errors.password) {
                                                setErrors((prev) => ({ ...prev, password: '' }))
                                            }
                                        }}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        activeOpacity={0.6}
                                        onPress={() => setShowPassword((prev) => !prev)}
                                        className="-mr-2 h-10 w-10 items-center justify-center rounded-full bg-slate-50 p-2"
                                    >
                                        <Feather name={showPassword ? 'eye' : 'eye-off'} size={16} color="#64748B" />
                                    </TouchableOpacity>
                                </View>
                                {errors.password ? (
                                    <Text className="ml-2 mt-2 text-xs font-black uppercase tracking-wide text-red-500">
                                        {errors.password}
                                    </Text>
                                ) : null}
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleLogin}
                                disabled={loading}
                                className="relative h-16 w-full flex-row items-center justify-center overflow-hidden rounded-2xl bg-[#CC0000] shadow-lg shadow-red-900/30"
                                style={{ opacity: loading ? 0.7 : 1 }}
                            >
                                <View
                                    className="absolute bottom-0 right-0 top-0 w-24 bg-white/10"
                                    style={{ transform: [{ skewX: '-30deg' }, { translateX: 20 }] }}
                                />
                                <Text className="text-base font-black uppercase tracking-widest text-white">
                                    {loading ? 'Entrando...' : 'Entrar no App'}
                                </Text>
                                {!loading && (
                                    <Feather name="arrow-right" size={18} color="white" style={{ marginLeft: 12 }} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}
