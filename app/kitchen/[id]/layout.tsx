export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
      {children}
    </div>
  );
}
