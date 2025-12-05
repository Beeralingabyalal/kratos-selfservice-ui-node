import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function AdminDashboard() {
  const [tenantName, setTenantName] = useState("");
  const [response, setResponse] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fake client-side admin guard
  useEffect(() => {
    const isAdmin = true;
    if (!isAdmin) {
      window.location.href = "/";
    }
  }, []);

  // Actual API call
  async function createTenant() {
    setResponse(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/tenant-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantName }),
      });

      const data = await res.json();
      setResponse(data);

      setToast({
        message: "Tenant created successfully!",
        type: "success",
      });

      setTenantName("");
    } catch (err) {
      setToast({
        message: "Failed to create tenant.",
        type: "error",
      });
    }

    setLoading(false);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <AdminLayout>
      <h1>Admin Dashboard</h1>
      <h3>Create Tenant</h3>

      {/* Step 13: Intercept submission and show confirmation */}
      <form
        onSubmit={(e) => {
  e.preventDefault();

  const name = tenantName.trim();

  // Rule 1: Empty check
  if (!name) {
    setToast({ message: "Tenant name cannot be empty.", type: "error" });
    setTimeout(() => setToast(null), 3000);
    return;
  }

  // Rule 2: At least 3 characters
  if (name.length < 3) {
    setToast({ message: "Tenant name must be at least 3 characters.", type: "error" });
    setTimeout(() => setToast(null), 3000);
    return;
  }

  // Rule 3: Only letters & numbers
  if (!/^[a-zA-Z0-9]+$/.test(name)) {
    setToast({ message: "Tenant name must contain only letters and numbers.", type: "error" });
    setTimeout(() => setToast(null), 3000);
    return;
  }

  // Rule 4: Maximum length
  if (name.length > 30) {
    setToast({ message: "Tenant name cannot be longer than 30 characters.", type: "error" });
    setTimeout(() => setToast(null), 3000);
    return;
  }

  // All validation passed → show confirmation popup
  setConfirmOpen(true);
}}
        style={{ marginBottom: "20px" }}
      >
        <input
          type="text"
          placeholder="Tenant Name"
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          style={{
            padding: "10px",
            width: "250px",
            marginBottom: "10px",
          }}
        />
        <br />

        <button
          type="submit"
          style={{
            padding: "10px 20px",
            backgroundColor: "#444",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Tenant"}
        </button>
      </form>

      {/* Loading Spinner */}
      {loading && (
        <div
          style={{
            fontSize: "16px",
            color: "#666",
            marginTop: "10px",
          }}
        >
          ⏳ Processing...
        </div>
      )}

      {/* API Response */}
      {response && !loading && (
        <div style={{ marginTop: "20px", background: "#eee", padding: "10px" }}>
          <h4>API Response:</h4>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}

      {/* Toast Notification */}
      <Toast message={toast?.message} type={toast?.type} />

      {/* Step 13: Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        message={`Are you sure you want to create tenant "${tenantName}"?`}
        onConfirm={() => {
          setConfirmOpen(false);
          createTenant();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
