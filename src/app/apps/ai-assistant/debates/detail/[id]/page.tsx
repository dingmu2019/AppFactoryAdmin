import { redirect } from 'next/navigation';

export default async function LegacyDebateDetailRedirect({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ai-debates/${id}`);
}

