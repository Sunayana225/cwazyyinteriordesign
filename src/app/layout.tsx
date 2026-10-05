import { MotionProvider } from '@/components/MotionProvider';
import './globals.css'
import { Inter, Playfair_Display } from 'next/font/google'
import Navbar from '@/components/Navbar'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata = {
  title: {
    default: 'Alvéo - Carved for you',
    template: '%s | Alvéo',
  },
  description: 'Custom closet layouts designed around your wardrobe, your life, your space',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans bg-cream-50 text-charcoal-500">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] bg-white p-3">Skip to content</a>
        <MotionProvider><Navbar />{children}</MotionProvider>
      </body>
    </html>
  )
}