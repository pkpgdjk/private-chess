import { AnalysisClient } from './AnalysisClient';

type AnalysisPageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { gameId } = await params;

  return <AnalysisClient gameId={gameId} />;
}
