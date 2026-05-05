import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import {
  createEventJsonLd,
  createRouteMetadata,
  createWebsiteJsonLd,
  getActiveConferenceForSeo,
  getConferenceDescription,
  getConferenceTitle,
  getSiteUrl,
} from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const conference = await getActiveConferenceForSeo()

  return {
    ...createRouteMetadata({
      title: getConferenceTitle(conference),
      description: getConferenceDescription(conference),
      path: '/',
      image: conference?.heroImageUrl || conference?.logoUrl,
    }),
    metadataBase: new URL(getSiteUrl()),
    applicationName: 'REC & Expo',
    generator: 'derrickml.com',
    category: 'conference',
    keywords: [
      'Renewable Energy Conference',
      'REC Expo',
      'NREP',
      'Uganda renewable energy',
      'clean energy conference',
      'renewable energy expo',
    ],
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const structuredDataPromise = getActiveConferenceForSeo()

  return (
    <html lang="en">
      <body>
        {children}
        <StructuredData conferencePromise={structuredDataPromise} />
        <Toaster />
      </body>
    </html>
  )
}

async function StructuredData({
  conferencePromise,
}: {
  conferencePromise: Promise<Record<string, unknown> | null>
}) {
  const conference = await conferencePromise
  const payloads = [
    createWebsiteJsonLd(conference),
    createEventJsonLd(conference),
  ].filter(Boolean)

  return (
    <>
      {payloads.map((payload, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(payload).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  )
}
