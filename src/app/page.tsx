import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/today')

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden relative"
      style={{ background: '#080808' }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 45% at 50% 46%, rgba(255,255,255,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Centre content */}
      <div className="relative flex flex-col items-center text-center">

        {/* Label */}
        <p
          className="text-[10px] text-white/20 tracking-[0.45em] uppercase mb-10"
          style={{ animation: 'fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.05s' }}
        >
          your private journal
        </p>

        {/* Wordmark */}
        <h1
          className="text-[52px] md:text-[80px] font-light tracking-[0.22em] uppercase text-white/85 leading-none mb-10"
          style={{ animation: 'fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.2s' }}
        >
          SelfScribe
        </h1>

        {/* Tagline */}
        <p
          className="text-white/35 text-[15px] md:text-[17px] leading-[1.9] mb-12"
          style={{
            fontFamily: 'Georgia, serif',
            animation: 'fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both',
            animationDelay: '0.38s',
          }}
        >
          Write every day.
          <br />
          Watch yourself unfold.
        </p>

        {/* Thin vertical divider */}
        <div
          className="w-px h-10 mb-12"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.12), transparent)',
            animation: 'fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both',
            animationDelay: '0.52s',
          }}
        />

        {/* CTA */}
        <Link
          href="/auth"
          className="text-[11px] text-white/40 hover:text-white/75 tracking-[0.3em] uppercase transition-colors border border-white/10 hover:border-white/25 rounded-sm px-9 py-3.5 active:scale-[0.98]"
          style={{ animation: 'fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.64s' }}
        >
          start writing
        </Link>
      </div>

      {/* Footer whisper */}
      <p
        className="absolute bottom-8 text-[10px] text-white/12 tracking-[0.3em] uppercase select-none"
        style={{ animation: 'fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '1s' }}
      >
        your words stay yours
      </p>
    </main>
  )
}
