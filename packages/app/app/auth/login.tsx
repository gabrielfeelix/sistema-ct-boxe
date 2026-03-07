import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { Redirect } from 'expo-router'
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
    const { loading: authLoading, session, signIn } = useAuth()

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

    if (!authLoading && session) {
        return <Redirect href="/(tabs)" />
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#FDFDFD' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ position: 'relative', flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
                        <View style={{ position: 'absolute', right: -80, top: 40, opacity: 0.05 }}>
                            <FontAwesome5 name="fire" size={300} color="#0F172A" />
                        </View>

                        <View style={{ marginBottom: 64, alignItems: 'center' }}>
                            <View
                                style={{
                                    marginBottom: 32,
                                    height: 80,
                                    width: 80,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 24,
                                    backgroundColor: '#0F172A',
                                }}
                            >
                                <Text style={{ fontSize: 30, fontWeight: '900', color: '#FFFFFF' }}>CT</Text>
                            </View>
                            <Text style={{ textAlign: 'center', fontSize: 36, fontWeight: '900', color: '#0F172A' }}>
                                Argel Riboli
                            </Text>
                            <Text
                                style={{
                                    marginTop: 8,
                                    textAlign: 'center',
                                    fontSize: 12,
                                    fontWeight: '700',
                                    color: '#94A3B8',
                                    textTransform: 'uppercase',
                                    letterSpacing: 3,
                                }}
                            >
                                Centro de Treinamento
                            </Text>
                        </View>

                        <View>
                            <View style={{ marginBottom: 20 }}>
                                <Text
                                    style={{
                                        marginBottom: 8,
                                        marginLeft: 4,
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: '#64748B',
                                        textTransform: 'uppercase',
                                        letterSpacing: 1.5,
                                    }}
                                >
                                    Usuario / Email
                                </Text>
                                <View
                                    style={{
                                        height: 64,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderRadius: 16,
                                        borderWidth: 1.5,
                                        borderColor: errors.email ? '#EF4444' : '#E2E8F0',
                                        backgroundColor: errors.email ? '#FEF2F2' : '#FFFFFF',
                                        paddingHorizontal: 20,
                                    }}
                                >
                                    <Feather name="mail" size={18} color={errors.email ? '#CC0000' : '#94A3B8'} />
                                    <TextInput
                                        style={{
                                            marginLeft: 12,
                                            height: '100%',
                                            flex: 1,
                                            fontSize: 16,
                                            fontWeight: '500',
                                            color: '#0F172A',
                                        }}
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
                                    <Text style={{ marginLeft: 8, marginTop: 8, fontSize: 12, fontWeight: '800', color: '#EF4444' }}>{errors.email}</Text>
                                ) : null}
                            </View>

                            <View style={{ marginBottom: 40 }}>
                                <View
                                    style={{
                                        marginBottom: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingHorizontal: 4,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '700',
                                            color: '#64748B',
                                            textTransform: 'uppercase',
                                            letterSpacing: 1.5,
                                        }}
                                    >
                                        Senha
                                    </Text>
                                    <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.6}>
                                        <Text
                                            style={{
                                                fontSize: 10,
                                                fontWeight: '700',
                                                color: '#94A3B8',
                                                textTransform: 'uppercase',
                                                letterSpacing: 1.5,
                                            }}
                                        >
                                            Esqueci a senha
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View
                                    style={{
                                        height: 64,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderRadius: 16,
                                        borderWidth: 1.5,
                                        borderColor: errors.password ? '#EF4444' : '#E2E8F0',
                                        backgroundColor: errors.password ? '#FEF2F2' : '#FFFFFF',
                                        paddingHorizontal: 20,
                                    }}
                                >
                                    <Feather
                                        name="lock"
                                        size={18}
                                        color={errors.password ? '#CC0000' : '#94A3B8'}
                                    />
                                    <TextInput
                                        style={{
                                            marginLeft: 12,
                                            height: '100%',
                                            flex: 1,
                                            fontSize: 16,
                                            fontWeight: '500',
                                            color: '#0F172A',
                                        }}
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
                                        style={{
                                            marginRight: -8,
                                            height: 40,
                                            width: 40,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 999,
                                            backgroundColor: '#F8FAFC',
                                            padding: 8,
                                        }}
                                    >
                                        <Feather name={showPassword ? 'eye' : 'eye-off'} size={16} color="#64748B" />
                                    </TouchableOpacity>
                                </View>
                                {errors.password ? (
                                    <Text style={{ marginLeft: 8, marginTop: 8, fontSize: 12, fontWeight: '800', color: '#EF4444' }}>{errors.password}</Text>
                                ) : null}
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleLogin}
                                disabled={loading}
                                style={{
                                    position: 'relative',
                                    height: 64,
                                    width: '100%',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    borderRadius: 16,
                                    backgroundColor: '#CC0000',
                                    opacity: loading ? 0.7 : 1,
                                }}
                            >
                                <View
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        top: 0,
                                        width: 96,
                                        backgroundColor: 'rgba(255,255,255,0.10)',
                                        transform: [{ skewX: '-30deg' }, { translateX: 20 }],
                                    }}
                                />
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: '900',
                                        color: '#FFFFFF',
                                        textTransform: 'uppercase',
                                        letterSpacing: 2,
                                    }}
                                >
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
