import { openExternal } from "../../platform";
import { useEffect, useRef } from "preact/hooks";

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    
    // Trap focus in modal - simplified version
    if (modalRef.current) {
        modalRef.current.focus();
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleLinkClick = (e: MouseEvent, url: string) => {
    e.preventDefault();
    openExternal(url);
  };

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          backgroundColor: "var(--bg-color, #fff)",
          color: "var(--text-color, #000)",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "400px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          position: "relative",
          outline: "none"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="about-title" style={{ marginTop: 0 }}>About Linéo</h2>
        <p>Linéo is a lightweight, high-performance data visualization and regression analysis tool.</p>
        <p>Version: {__APP_VERSION__}</p>
        <p>Build with Tauri & Preact.</p>
        <p>
          Author: ThomasByr -{" "}
          <a
            href="https://github.com/thomasbyr"
            onClick={(e) => handleLinkClick(e as any, "https://github.com/thomasbyr")}
            style={{ color: "var(--text-color, #000)" }}
          >
            GitHub
          </a>{" "}
          |{" "}
          <a
            href="https://github.com/thomasbyr/lineo"
            onClick={(e) => handleLinkClick(e as any, "https://github.com/thomasbyr/lineo")}
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
