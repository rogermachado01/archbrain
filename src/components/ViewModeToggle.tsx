export type ViewMode = "diagram" | "wiki";

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  wikiAvailable: boolean;
}

export default function ViewModeToggle({ mode, onChange, wikiAvailable }: ViewModeToggleProps) {
  return (
    <div className="view-mode-toggle" role="group" aria-label="View mode">
      <button
        type="button"
        className={mode === "diagram" ? "active" : ""}
        onClick={() => onChange("diagram")}
        title="Interactive architecture diagram"
      >
        Diagram
      </button>
      <button
        type="button"
        className={mode === "wiki" ? "active" : ""}
        onClick={() => onChange("wiki")}
        disabled={!wikiAvailable}
        title={wikiAvailable ? "Browse the OKF bundle's markdown docs" : "This source has no OKF docs to browse"}
      >
        OKF Wiki
      </button>
    </div>
  );
}
