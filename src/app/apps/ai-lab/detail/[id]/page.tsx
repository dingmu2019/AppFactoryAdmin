import { redirect } from 'next/navigation';

export default async function LegacyLabDetailRedirect({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ai-lab/${id}`);
}

