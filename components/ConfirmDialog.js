export default function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}
    >
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "5px",
          width: "300px",
          textAlign: "center",
          fontFamily: "Arial"
        }}
      >
        <p style={{ marginBottom: "20px" }}>{message}</p>

        <button
          onClick={onConfirm}
          style={{
            padding: "8px 15px",
            background: "#444",
            color: "white",
            marginRight: "10px",
            cursor: "pointer",
            border: "none"
          }}
        >
          Yes
        </button>

        <button
          onClick={onCancel}
          style={{
            padding: "8px 15px",
            background: "#ccc",
            cursor: "pointer",
            border: "none"
          }}
        >
          No
        </button>
      </div>
    </div>
  );
}
