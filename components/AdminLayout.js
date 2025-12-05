import Link from "next/link";

export default function AdminLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Arial" }}>
      <aside
        style={{
          width: "220px",
          background: "#222",
          color: "white",
          padding: "20px",
        }}
      >
        <h2 style={{ color: "white" }}>Admin Panel</h2>

        <nav style={{ marginTop: "30px", display: "flex", flexDirection: "column" }}>
          <Link href="/admin" style={{ color: "white", marginBottom: "15px" }}>
            Dashboard
          </Link>

          <Link href="/admin" style={{ color: "white", marginBottom: "15px" }}>
            Tenant Onboarding
          </Link>

          <Link href="/admin/logs" style={{ color: "white", marginBottom: "15px" }}>
            Audit Logs
          </Link>

          <Link href="/admin/tenants" style={{ color: "white", marginBottom: "15px" }}>
  Tenant List
</Link>

        </nav>
      </aside>

      <main style={{ flexGrow: 1, padding: "30px" }}>{children}</main>
    </div>
  );
}
