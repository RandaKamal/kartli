export default async function AdminView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <h1>Kitchen {id}</h1>
      <p>(admin view)</p>
    </main>
  );
}
