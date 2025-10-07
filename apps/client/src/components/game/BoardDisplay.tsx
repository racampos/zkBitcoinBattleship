/**
 * Board Display Component
 * Renders a Battleship board (ASCII-style)
 */

import React from "react";
import type { Board } from "../../utils/boardUtils";

interface BoardDisplayProps {
  board: Board;
  title: string;
}

export function BoardDisplay({ board, title }: BoardDisplayProps) {
  const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  const renderCell = (cell: number) => {
    if (cell === 1) {
      return <span style={{ color: "#4CAF50", fontWeight: "bold" }}>S</span>; // Ship (green)
    } else if (cell === 2) {
      return <span style={{ color: "#F44336", fontWeight: "bold" }}>X</span>; // Hit (red)
    } else if (cell === 3) {
      return <span style={{ color: "#2196F3" }}>o</span>; // Miss (blue)
    } else if (cell === 4) {
      return <span style={{ color: "#FFA726", fontWeight: "bold" }}>?</span>; // Pending shot (orange)
    } else {
      return <span style={{ color: "#555" }}>·</span>; // Water (gray)
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: "10px", color: "#4CAF50" }}>{title}</h3>
      <div
        style={{
          fontFamily: "'Monaco', 'Courier New', monospace",
          fontSize: "14px",
          lineHeight: "1.4",
          background: "#2a2a2a",
          padding: "15px",
          borderRadius: "8px",
        }}
      >
        {/* Header with column numbers */}
        <div style={{ color: "#4CAF50", fontWeight: "bold", marginBottom: "4px" }}>
          &nbsp;&nbsp;1 2 3 4 5 6 7 8 9 10
        </div>

        {/* Board rows */}
        {board.map((row, y) => (
          <div key={y} style={{ margin: "2px 0" }}>
            {rowLabels[y]}&nbsp;&nbsp;
            {row.map((cell, x) => (
              <span key={x}>
                {renderCell(cell)}{" "}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
