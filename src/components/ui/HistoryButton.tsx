import { useState, useRef, useEffect } from "preact/hooks";
import { JSX } from "preact";

interface HistoryItem {
  description: string;
  timestamp: number;
}

interface HistoryButtonProps {
  icon: JSX.Element;
  onClick: () => void;
  disabled: boolean;
  items: HistoryItem[];
  onItemClick: (count: number) => void;
  title: string;
}

export function HistoryButton({ icon, onClick, disabled, items, onItemClick, title }: HistoryButtonProps) {
  const [showList, setShowList] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);

  const handleMouseDown = (e: MouseEvent) => {
    if (disabled) return;

    if (e.button === 2) {
      // Right click
      e.preventDefault();
      if (items.length > 0) setShowList(true);
      return;
    }

    if (e.button === 0) {
      // Left click
      isLongPress.current = false;
      longPressTimer.current = window.setTimeout(() => {
        if (items.length > 0) {
          setShowList(true);
          isLongPress.current = true;
        }
      }, 500);
    }
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setShowList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (showList) {
      // Focus the first item when the list opens
      setTimeout(() => itemRefs.current[0]?.focus(), 0);
    }
  }, [showList]);

  const openListForKeyboard = () => {
    if (items.length > 0 && !disabled) setShowList(true);
  };

  const onButtonKeyDown = (e: KeyboardEvent) => {
    const key = (e as any).key;
    if (key === "ArrowDown") {
      e.preventDefault();
      openListForKeyboard();
    }
    if (key === "Enter" || key === " ") {
      // Let normal click behavior happen
    }
  };

  return (
    <div className="history-btn-container" style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        className="icon-btn"
        onClick={handleClick}
        onMouseDown={handleMouseDown as any}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onKeyDown={onButtonKeyDown as any}
        aria-haspopup="menu"
        aria-expanded={showList}
        disabled={disabled}
        title={title}
        style={{
          background: "none",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          padding: "8px",
          opacity: disabled ? 0.5 : 1,
          color: "var(--text-color)",
        }}
      >
        {icon}
      </button>
      {showList && (
        <div className="history-list" ref={listRef} role="menu" aria-label={title}>
          {items
            .slice()
            .reverse()
            .map((item, i) => (
              <button
                key={i}
                className="history-item"
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={(e) => {
                  e.preventDefault();
                  onItemClick(i + 1);
                  setShowList(false);
                  buttonRef.current?.focus();
                }}
                onKeyDown={(e) => {
                  const key = (e as any).key;
                  if (key === "Escape") {
                    setShowList(false);
                    buttonRef.current?.focus();
                  }
                }}
              >
                {item.description}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
