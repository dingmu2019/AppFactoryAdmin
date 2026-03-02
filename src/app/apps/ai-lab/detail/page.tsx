import { redirect } from 'next/navigation';

export default async function LegacyLabDetailIndex({
  searchParams
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (id) redirect(`/ai-lab/${id}`);
  redirect('/apps/ai-lab');
}

