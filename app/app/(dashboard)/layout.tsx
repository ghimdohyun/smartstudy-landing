// Dashboard route group layout — pass-through (each page controls its own chrome)
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
