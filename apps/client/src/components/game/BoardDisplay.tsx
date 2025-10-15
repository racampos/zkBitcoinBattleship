/**
 * Board Display Component
 * Renders a Battleship board with HTML grid and colored ships
 */

import React from "react";
import type { Board, PlacedShip } from "../../utils/boardUtils";

interface BoardDisplayProps {
  board: Board;
  ships: PlacedShip[];
  title: string;
  isActive?: boolean; // For "Your Turn" shimmer effect
  isVictory?: boolean; // For victory animation
  isDefeat?: boolean; // For defeat animation
  showShipColors?: boolean; // Hide ship colors on attack board
  onCellClick?: (row: number, col: number) => void; // For clickable attack board
  isClickable?: boolean; // Whether cells can be clicked
}

export function BoardDisplay({ 
  board, 
  ships,
  title, 
  isActive = false, 
  isVictory = false, 
  isDefeat = false,
  showShipColors = true,
  onCellClick,
  isClickable = false
}: BoardDisplayProps) {
  const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  // Find which ship occupies a given cell
  const getShipForCell = (row: number, col: number): PlacedShip | null => {
    if (board[row][col] !== 1) return null;
    
    for (const ship of ships) {
      if (ship.orientation === 'horizontal') {
        if (ship.y === row && col >= ship.x && col < ship.x + ship.size) {
          return ship;
        }
      } else {
        if (ship.x === col && row >= ship.y && row < ship.y + ship.size) {
          return ship;
        }
      }
    }
    return null;
  };

  // Get CSS classes for a cell
  const getCellClassName = (row: number, col: number): string => {
    const cell = board[row][col];
    const ship = getShipForCell(row, col);
    
    let classes = ['grid-cell'];
    
    // Base state
    if (cell === 0) {
      classes.push('cell-water');
    } else if (cell === 1 && ship && showShipColors) {
      classes.push(`cell-ship ship-${ship.type}`);
    } else if (cell === 1) {
      classes.push('cell-ship');
    } else if (cell === 2) {
      classes.push('cell-hit');
    } else if (cell === 3) {
      classes.push('cell-miss');
    } else if (cell === 4) {
      classes.push('cell-pending');
    }
    
    // Add clickable class for unfired cells
    if (isClickable && cell === 0) {
      classes.push('cell-clickable');
    }
    
    return classes.join(' ');
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    // Only allow clicks on unfired cells (value 0)
    if (isClickable && board[row][col] === 0 && onCellClick) {
      onCellClick(row, col);
    }
  };

  // Build className for board container
  let boardClassName = "board-display-grid";
  if (isActive) boardClassName += " active";
  if (isVictory) boardClassName += " victory-board";
  if (isDefeat) boardClassName += " defeat-board";

  return (
    <div className={boardClassName}>
      <h3 className="board-title">{title}</h3>
      
      <div className="battleship-grid-container">
        {/* Column headers */}
        <div className="grid-header-row">
          <div className="grid-corner"></div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <div key={n} className="grid-col-header">{n}</div>
          ))}
        </div>
        
        {/* Rows with labels */}
        {board.map((row, y) => (
          <div key={y} className="grid-row-container">
            <div className="grid-row-header">{rowLabels[y]}</div>
            <div className="grid-row">
              {row.map((cell, x) => (
                <div 
                  key={x} 
                  className={getCellClassName(y, x)}
                  data-coord={`${rowLabels[y]}${x + 1}`}
                  title={`${rowLabels[y]}${x + 1}`}
                  onClick={() => handleCellClick(y, x)}
                  style={{ cursor: (isClickable && cell === 0) ? 'pointer' : 'default' }}
                >
                  {/* Overlay icons for hits and pending shots (no icon for misses) */}
                  {cell === 2 && <span className="cell-overlay">💥</span>}
                  {cell === 4 && <span className="cell-overlay">⏳</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Ship legend (only if showing ship colors) */}
      {showShipColors && ships.length > 0 && (
        <div className="ship-legend">
          {ships.map(ship => (
            <div key={ship.id} className="legend-item">
              <div className={`legend-color ship-${ship.type}`}></div>
              <span>{ship.name} ({ship.size})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
