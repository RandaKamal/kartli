export default async function MemberView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <h1>Kitchen {id}</h1>
      <p>(member view)</p>
    </main>
  );
}
