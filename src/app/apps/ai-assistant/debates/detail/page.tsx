import { redirect } from 'next/navigation';

export default async function LegacyDebateDetailIndex({
  searchParams
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (id) redirect(`/ai-debates/${id}`);
  redirect('/ai-debates');
}

