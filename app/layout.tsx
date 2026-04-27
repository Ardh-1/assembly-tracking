import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AssemblyTrack — System Pelacakan Perakitan',
  description: 'Sistem pelacakan lini perakitan berbasis QR Code untuk monitoring produksi real-time',
  keywords: ['assembly', 'tracking', 'manufacturing', 'QR code', 'production'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
