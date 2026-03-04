import React, { Component, ReactNode } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

interface Props {
    children: ReactNode
    fallback?: (error: Error, retry: () => void) => ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error!, this.handleRetry)
            }

            return (
                <View className="flex-1 items-center justify-center bg-[#FDFDFD] px-6">
                    <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl border border-red-100 bg-red-50">
                        <Feather name="alert-triangle" size={32} color="#DC2626" />
                    </View>
                    <Text className="mb-2 text-2xl font-black tracking-tight text-slate-900">Ops!</Text>
                    <Text className="mb-8 max-w-sm text-center text-sm font-medium leading-relaxed text-slate-500">
                        Algo deu errado. Tente novamente ou volte mais tarde.
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={this.handleRetry}
                        className="h-12 flex-row items-center justify-center rounded-xl border border-slate-200 bg-white px-8 shadow-sm"
                    >
                        <Feather name="refresh-cw" size={16} color="#0F172A" style={{ marginRight: 8 }} />
                        <Text className="text-sm font-bold tracking-wide text-slate-900">Tentar Novamente</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return this.props.children
    }
}
