import {
  REFERRAL_RISK_COLOR,
  REFERRAL_RISK_LABEL,
  type ReferralRisk,
} from "@/types/domain";

// Cores clínicas do protocolo impresso (azul/verde/amarelo/vermelho) — exceção
// justificada à paleta: são o código de risco que o profissional já conhece.
const RISK_CLASS: Record<ReferralRisk, string> = {
  eletivo: "border-sky-700 text-sky-800 bg-sky-50",
  prioritario: "border-emerald-700 text-emerald-800 bg-emerald-50",
  urgencia: "border-amber-500 text-amber-900 bg-amber-50",
  emergencia: "border-red-700 text-red-800 bg-red-50",
};

interface RiskBadgeProps {
  risk: ReferralRisk;
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 border font-mono text-[10px] uppercase tracking-[0.14em] ${RISK_CLASS[risk]}`}
      title={`Classificação de risco: ${REFERRAL_RISK_LABEL[risk]} (${REFERRAL_RISK_COLOR[risk]})`}
    >
      {REFERRAL_RISK_LABEL[risk]}
    </span>
  );
}
