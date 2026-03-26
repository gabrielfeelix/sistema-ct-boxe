import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'CT de Boxe - Argel Riboli',
    description: 'Sistema de gestao do CT de Boxe - Equipe Argel Riboli',
    icons: {
        icon: [{ url: '/icon.png', type: 'image/png' }],
        shortcut: ['/favicon.ico'],
        apple: ['/apple-icon.png'],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'CT de Boxe - Argel Riboli',
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
