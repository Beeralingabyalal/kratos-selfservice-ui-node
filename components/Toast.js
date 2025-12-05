export default function Toast({ message, type }) {
  if (!message) return null;

  const background = type === "error" ? "#d9534f" : "#5cb85c";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background,
        color: "white",
        padding: "12px 20px",
        borderRadius: "5px",
        zIndex: 9999,
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        fontFamily: "Arial",
      }}
    >
      {message}
    </div>
  );
}
