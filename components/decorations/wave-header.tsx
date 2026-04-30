/**
 * Faixa decorativa em ondas — paleta institucional de Caucaia.
 * Usada como header sutil em páginas públicas.
 *
 * Pure SVG, sem dependências, sem JS. Stroke-only pra ficar leve.
 */
export function WaveHeader({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="block w-full h-[60px] sm:h-[80px]"
        role="presentation"
      >
        {/* Onda cinza claro — base */}
        <path
          d="M0,40 C240,80 480,10 720,40 C960,70 1200,20 1440,50 L1440,120 L0,120 Z"
          fill="#e7e5e4"
          opacity="0.85"
        />
        {/* Onda cinza médio */}
        <path
          d="M0,60 C240,30 480,90 720,60 C960,30 1200,80 1440,55 L1440,120 L0,120 Z"
          fill="#a6a09b"
          opacity="0.55"
        />
        {/* Onda cinza escuro */}
        <path
          d="M0,80 C240,100 480,60 720,90 C960,110 1200,70 1440,90 L1440,120 L0,120 Z"
          fill="#44403b"
          opacity="0.85"
        />
        {/* Onda vermelho Caucaia (mais espessa, no fundo) */}
        <path
          d="M0,95 C240,75 480,115 720,100 C960,85 1200,110 1440,95 L1440,120 L0,120 Z"
          fill="#c41e3a"
        />
      </svg>
    </div>
  );
}
