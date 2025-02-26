import Pricing from '@/components/ui/pricing';

export default function PlansPage({ params }: { params: { team: string } }) {
  return <Pricing teamSlug={params.team} variant="onboarding" />;
}
