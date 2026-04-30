/**
 * Padrão de marca-d'água com iconografia de saúde — cruz médica,
 * batimento cardíaco, cápsula, estetoscópio. Aplicado como background
 * em opacidade muito baixa (~5-7%) atrás do conteúdo.
 *
 * Pure SVG inline. Position absolute pra não interferir no layout.
 */

interface HealthPatternProps {
  className?: string;
  opacity?: number;
}

export function HealthPattern({
  className = "",
  opacity = 0.06,
}: HealthPatternProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
      style={{ opacity }}
    >
      <svg
        className="block w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        <defs>
          <pattern
            id="health-tile"
            x="0"
            y="0"
            width="220"
            height="220"
            patternUnits="userSpaceOnUse"
          >
            {/* Cruz médica */}
            <g transform="translate(20,20)" fill="none" stroke="#1c1917" strokeWidth="2">
              <rect x="14" y="0" width="12" height="40" />
              <rect x="0" y="14" width="40" height="12" />
            </g>

            {/* Batimento cardíaco */}
            <g
              transform="translate(95,30)"
              fill="none"
              stroke="#c41e3a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0,15 L15,15 L20,5 L28,28 L34,12 L40,15 L60,15" />
            </g>

            {/* Cápsula */}
            <g transform="translate(170,15)" fill="none" stroke="#1c1917" strokeWidth="2">
              <rect x="0" y="0" width="36" height="14" rx="7" />
              <line x1="18" y1="0" x2="18" y2="14" />
            </g>

            {/* Estetoscópio (curva + círculo) */}
            <g
              transform="translate(30,110)"
              fill="none"
              stroke="#166534"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M0,0 Q5,30 25,30 Q45,30 45,55" />
              <circle cx="45" cy="65" r="10" />
            </g>

            {/* Coração outline */}
            <g transform="translate(140,120)" fill="none" stroke="#c41e3a" strokeWidth="2">
              <path d="M30,8 C30,2 24,0 20,4 C16,0 10,2 10,8 C10,16 20,24 20,24 C20,24 30,16 30,8 Z" />
            </g>

            {/* Cruz médica menor (variação) */}
            <g transform="translate(180,160)" fill="#1c1917">
              <rect x="9" y="0" width="6" height="24" rx="1" />
              <rect x="0" y="9" width="24" height="6" rx="1" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#health-tile)" />
      </svg>
    </div>
  );
}

/**
 * Silhuetas estilizadas de profissionais da saúde — vetorial autoral,
 * sem dependência de stock photo. Use como decoração lateral em hero.
 */
interface HealthcareSilhouettesProps {
  className?: string;
}

export function HealthcareSilhouettes({
  className = "",
}: HealthcareSilhouettesProps) {
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <svg
        viewBox="0 0 320 240"
        className="block w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        {/* Silhueta 1 — médica/médico (jaleco, estetoscópio) */}
        <g opacity="0.10" fill="#1c1917">
          {/* Cabeça */}
          <circle cx="80" cy="50" r="22" />
          {/* Pescoço */}
          <rect x="74" y="68" width="12" height="10" />
          {/* Jaleco/corpo */}
          <path d="M40,80 Q40,75 55,75 L70,75 Q80,82 90,75 L105,75 Q120,75 120,80 L120,180 L40,180 Z" />
          {/* Bolso */}
          <rect x="95" y="120" width="18" height="20" fill="white" opacity="0.4" />
        </g>
        {/* Estetoscópio */}
        <g
          opacity="0.20"
          fill="none"
          stroke="#c41e3a"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M70,82 Q60,100 60,115 Q60,128 80,128 Q100,128 100,140" />
          <circle cx="100" cy="148" r="6" fill="#c41e3a" />
        </g>

        {/* Silhueta 2 — enfermeira/enfermeiro (touca/lateral) */}
        <g opacity="0.08" fill="#1c1917">
          <circle cx="220" cy="65" r="20" />
          {/* Touca */}
          <path d="M200,55 L210,40 L230,40 L240,55 Z" fill="#1c1917" />
          {/* Cruz na touca */}
          <rect x="217" y="44" width="6" height="2" fill="#c41e3a" opacity="0.8" />
          <rect x="219" y="42" width="2" height="6" fill="#c41e3a" opacity="0.8" />
          {/* Pescoço */}
          <rect x="214" y="83" width="12" height="10" />
          {/* Corpo (uniforme) */}
          <path d="M180,95 Q180,90 195,90 L210,90 Q220,98 230,90 L245,90 Q260,90 260,95 L260,200 L180,200 Z" />
        </g>
      </svg>
    </div>
  );
}
