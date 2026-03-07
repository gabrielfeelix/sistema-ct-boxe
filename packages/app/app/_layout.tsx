import '../global.css'

import { Stack } from 'expo-router'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { AuthProvider } from '@/contexts/AuthContext'

export default function RootLayout() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <GluestackUIProvider mode="light">
                    <Stack
                        screenOptions={{
                            headerShown: false,
                        }}
                    >
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="auth" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="aula/[id]"
                            options={{
                                presentation: 'transparentModal',
                                animation: 'slide_from_bottom',
                                headerShown: false,
                                contentStyle: { backgroundColor: 'transparent' },
                            }}
                        />
                        <Stack.Screen name="notificacoes" options={{ headerShown: false }} />
                        <Stack.Screen name="pagamento" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="dados-cadastrais" options={{ headerShown: false }} />
                    </Stack>
                </GluestackUIProvider>
            </AuthProvider>
        </ErrorBoundary>
    )
}
