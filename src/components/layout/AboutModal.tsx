import { openExternal } from "../../platform";

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-color, #fff)",
          color: "var(--text-color, #000)",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "400px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>About Linéo</h2>
        <p>Linéo is a lightweight, high-performance data visualization and regression analysis tool.</p>
        <p>Version: {__APP_VERSION__}</p>
        <p>Build with Tauri & Preact.</p>
        <p>
          Author: ThomasByr -{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openExternal("https://github.com/thomasbyr");
            }}
            style={{ color: "var(--text-color, #000)" }}
          >
            GitHub
          </a>{" "}
          |{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openExternal("https://github.com/thomasbyr/lineo");
            }}
            style={{ color: "var(--text-color, #000)" }}
          >
            Project
          </a>
        </p>
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "#396cd8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
