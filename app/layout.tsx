import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Renewable Energy Conference and Expo',
  description: 'Created by NREP',
  generator: 'derrickml.com',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
