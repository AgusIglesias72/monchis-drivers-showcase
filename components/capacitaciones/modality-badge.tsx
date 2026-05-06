import { MapPin, Video, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OnboardingModality } from '@prisma/client'
import { MODALITY_LABEL } from '@/lib/types/onboarding-rules.types'

const ICONS = { IN_PERSON: MapPin, VIRTUAL: Video, HYBRID: Zap }

const STYLES: Record<OnboardingModality, string> = {
  IN_PERSON: 'bg-muted text-foreground',
  VIRTUAL: 'bg-info-soft text-info',
  HYBRID: 'bg-violet-100 text-violet-700',
}

export function ModalityBadge({ modality }: { modality: OnboardingModality }) {
  const Icon = ICONS[modality]
  return (
    <Badge variant="secondary" className={STYLES[modality]}>
      <Icon className="mr-1 h-3 w-3" />
      {MODALITY_LABEL[modality]}
    </Badge>
  )
}
