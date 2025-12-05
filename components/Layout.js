import Link from "next/link";

export default function Layout({ children }) {
  return (
    <div>
      <nav
        style={{
          padding: "10px",
          background: "#222",
          color: "white",
          marginBottom: "20px",
        }}
      >
        <Link href="/" style={{ marginRight: "20px", color: "white" }}>
          Home
        </Link>

        <Link href="/admin" style={{ color: "white" }}>
          Admin
        </Link>

        <Link href="/admin/logs" style={{ marginLeft: "20px", color: "white" }}>
            Admin Logs
        </Link>

      </nav>

      <div>{children}</div>
    </div>
  );
}
