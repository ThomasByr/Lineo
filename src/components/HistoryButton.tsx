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
        
        if (e.button === 2) { // Right click
            e.preventDefault();
            if (items.length > 0) setShowList(true);
            return;
        }
        
        if (e.button === 0) { // Left click
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
            if (listRef.current && !listRef.current.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
                setShowList(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="history-btn-container" style={{ position: 'relative' }}>
            <button
                ref={buttonRef}
                className="icon-btn"
                onClick={handleClick}
                onMouseDown={handleMouseDown as any}
                onMouseUp={handleMouseUp}
                onContextMenu={(e) => { e.preventDefault(); }}
                disabled={disabled}
                title={title}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: '8px',
                    opacity: disabled ? 0.5 : 1,
                    color: 'var(--text-color)'
                }}
            >
                {icon}
            </button>
            {showList && (
                <div className="history-list" ref={listRef} style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'var(--bg-color, #fff)',
                    border: '1px solid var(--border-color, #ccc)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    width: '200px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    color: 'var(--text-color, #000)'
                }}>
                    {items.slice().reverse().map((item, i) => (
                        <div 
                            key={i} 
                            className="history-item"
                            onClick={() => {
                                onItemClick(i + 1);
                                setShowList(false);
                            }}
                            style={{ 
                                padding: '8px', 
                                cursor: 'pointer', 
                                borderBottom: '1px solid var(--border-color, #eee)',
                                fontSize: '12px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {item.description}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
