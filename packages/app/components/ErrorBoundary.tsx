import React, { Component, ReactNode } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

interface Props {
    children: ReactNode
    fallback?: (error: Error, retry: () => void) => ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo)
        if (errorInfo.componentStack) {
            console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
        }
        this.setState({ errorInfo })
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error!, this.handleRetry)
            }

            const isDev = __DEV__

            return (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FDFDFD',
                        paddingHorizontal: 24,
                    }}
                >
                    <View
                        style={{
                            marginBottom: 24,
                            height: 80,
                            width: 80,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: '#FECACA',
                            backgroundColor: '#FEF2F2',
                        }}
                    >
                        <Feather name="alert-triangle" size={32} color="#DC2626" />
                    </View>
                    <Text
                        style={{
                            marginBottom: 8,
                            fontSize: 28,
                            fontWeight: '900',
                            color: '#0F172A',
                        }}
                    >
                        Ops!
                    </Text>
                    <Text
                        style={{
                            marginBottom: 32,
                            maxWidth: 320,
                            textAlign: 'center',
                            fontSize: 14,
                            fontWeight: '500',
                            lineHeight: 20,
                            color: '#64748B',
                        }}
                    >
                        Algo deu errado. Tente novamente ou volte mais tarde.
                    </Text>

                    {isDev && this.state.error && (
                        <ScrollView
                            style={{
                                marginBottom: 24,
                                width: '100%',
                                maxHeight: 160,
                                borderRadius: 12,
                                backgroundColor: '#F8FAFC',
                                padding: 16,
                            }}
                        >
                            <Text style={{ fontSize: 12, color: '#DC2626' }}>{this.state.error.toString()}</Text>
                            {this.state.error.stack && (
                                <Text style={{ marginTop: 8, fontSize: 10, color: '#475569' }}>{this.state.error.stack}</Text>
                            )}
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={this.handleRetry}
                        style={{
                            height: 48,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            backgroundColor: '#FFFFFF',
                            paddingHorizontal: 32,
                        }}
                    >
                        <Feather name="refresh-cw" size={16} color="#0F172A" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Tentar Novamente</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return this.props.children
    }
}
