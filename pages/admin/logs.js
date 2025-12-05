import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";

export default function AdminLogs() {
  const [logs, setLogs] = useState("Loading...");

  useEffect(() => {
    async function loadLogs() {
      const res = await fetch("/api/admin/get-logs");
      const data = await res.json();
      setLogs(data.logs || "No logs found.");
    }

    loadLogs();
  }, []);

  return (
    <AdminLayout>
      <h1>Admin Logs</h1>

      <pre
        style={{
          background: "#eee",
          padding: "15px",
          whiteSpace: "pre-wrap",
          borderRadius: "5px",
          marginTop: "20px",
        }}
      >
        {logs}
      </pre>
    </AdminLayout>
  );
}
