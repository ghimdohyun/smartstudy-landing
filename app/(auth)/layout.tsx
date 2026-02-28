// Auth route group layout — centered card layout for login/register
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#eff6ff,#eef2ff,#f5f3ff)",
        padding: "24px 16px",
      }}
    >
      {children}
    </div>
  );
}
