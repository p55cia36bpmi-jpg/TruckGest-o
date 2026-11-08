import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TruckGestão - Gestão de Frotas',
  description: 'Sistema completo e profissional de gestão de frotas comerciais e pesadas: telemetria, manutenção preventiva, abastecimento, controle de motoristas e custos operacionais.',
  openGraph: {
    title: 'TruckGestão - Gestão de Frotas',
    description: 'Sistema completo e profissional de gestão de frotas comerciais e pesadas: telemetria, manutenção preventiva, abastecimento, controle de motoristas e custos operacionais.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TruckGestão - Gestão de Frotas',
    description: 'Sistema completo e profissional de gestão de frotas comerciais e pesadas: telemetria, manutenção preventiva, abastecimento, controle de motoristas e custos operacionais.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-amber-500 selection:text-slate-950 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
