import { redirect } from 'next/navigation';

export default async function LegacyPublicDebateIndex({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (token) redirect(`/share/debate/${token}`);
  redirect('/');
}

