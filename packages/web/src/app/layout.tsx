import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'CT Boxe — Painel de Gestão',
    description: 'Sistema de gestão do CT de Boxe — Equipe Argel Riboli',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'CT Boxe',
    },
    formatDetection: {
        telephone: false,
    },
}

export const viewport: Viewport = {
    themeColor: '#CC0000',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="pt-BR">
            <body className={inter.className}>
                {children}
                <Toaster richColors position="top-right" />
            </body>
        </html>
    )
}
