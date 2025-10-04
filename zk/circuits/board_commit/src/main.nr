// BoardCommit - Poseidon2 version (for Starknet)
// Proves valid board placement without revealing ship positions

use dep::poseidon2::bn254::hash_2;

// Simplified ship validation - checks that board has exactly 17 cells and valid ship configuration
fn validate_and_commit(board: [Field; 100], salt: Field) -> Field {
    // 1) Assert all cells are bits (0 or 1) and count total ships
    let mut ones: Field = 0;
    for i in 0..100 {
        let b = board[i];
        assert(b * (1 - b) == 0); // b must be 0 or 1
        ones += b;
    }
    assert(ones == 17); // Exactly 17 ship cells

    // 2) Count ships by finding "start" positions (where top and left neighbors are 0)
    let mut count_len2: Field = 0;
    let mut count_len3: Field = 0;
    let mut count_len4: Field = 0;
    let mut count_len5: Field = 0;

    for r in 0..10 {
        for c in 0..10 {
            let index = r * 10 + c;
            let b = board[index];
            
            if b == 1 {
                // Check if this is a ship start
                let up_is_one = if r > 0 { board[index - 10] == 1 } else { false };
                let left_is_one = if c > 0 { board[index - 1] == 1 } else { false };

                if !(up_is_one | left_is_one) {
                    // This is a ship start - determine orientation
                    let right = if c + 1 < 10 { board[index + 1] } else { 0 };
                    let down = if r + 1 < 10 { board[index + 10] } else { 0 };

                    // Can't be both horizontal and vertical (no L-shapes)
                    assert(!((right == 1) & (down == 1)));
                    
                    // Must have at least one neighbor (no single-cell ships)
                    assert((right == 1) | (down == 1));

                    // Count ship length (stop at first water cell)
                    let mut len: Field = 1;
                    let mut found_end = false;
                    
                    if right == 1 {
                        // Horizontal ship
                        for offset in 1..10 {
                            if ((c + offset < 10) & !found_end) {
                                if board[index + offset] == 1 {
                                    len += 1;
                                } else {
                                    found_end = true;
                                }
                            }
                        }
                    } else {
                        // Vertical ship
                        for offset in 1..10 {
                            if ((r + offset < 10) & !found_end) {
                                if board[index + offset * 10] == 1 {
                                    len += 1;
                                } else {
                                    found_end = true;
                                }
                            }
                        }
                    }
                    
                    // Tally by length
                    if len == 2 { count_len2 += 1; }
                    if len == 3 { count_len3 += 1; }
                    if len == 4 { count_len4 += 1; }
                    if len == 5 { count_len5 += 1; }
                    
                    // Must be valid ship length
                    assert((len == 2) | (len == 3) | (len == 4) | (len == 5));
                }
            }
        }
    }

    // Expected: 1 destroyer(2), 2 cruisers(3), 1 battleship(4), 1 carrier(5)
    assert(count_len2 == 1);
    assert(count_len3 == 2);
    assert(count_len4 == 1);
    assert(count_len5 == 1);

    // 3) Compute Poseidon2 commitment by folding board with salt
    // commitment = hash_2(hash_2(...hash_2(hash_2(0, board[0]), board[1])..., board[99]), salt)
    let mut acc: Field = 0;
    for i in 0..100 {
        acc = hash_2([acc, board[i]]);
    }
    let commitment = hash_2([acc, salt]);
    
    commitment
}

fn main(board: [Field; 100], salt: Field) -> pub Field {
    validate_and_commit(board, salt)
}

// ============================================================================
// TEST HELPERS
// ============================================================================

// Helper: Create empty 10x10 board
fn empty_board() -> [Field; 100] {
    [0; 100]
}

// Helper: Place a horizontal ship starting at (row, col) with given length
fn place_horizontal_ship(board: [Field; 100], row: u32, col: u32, length: u32) -> [Field; 100] {
    let mut new_board = board;
    for i in 0..length {
        let index = row * 10 + col + i;
        new_board[index] = 1;
    }
    new_board
}

// Helper: Place a vertical ship starting at (row, col) with given length
fn place_vertical_ship(board: [Field; 100], row: u32, col: u32, length: u32) -> [Field; 100] {
    let mut new_board = board;
    for i in 0..length {
        let index = (row + i) * 10 + col;
        new_board[index] = 1;
    }
    new_board
}

// Helper: Create a valid Battleship board (standard configuration)
// Layout:
//   Row 0: Carrier (length 5) at columns 0-4
//   Row 2: Battleship (length 4) at columns 0-3
//   Row 4: Cruiser (length 3) at columns 0-2
//   Row 6: Submarine (length 3) at columns 0-2
//   Row 8: Destroyer (length 2) at columns 0-1
fn valid_board_horizontal() -> [Field; 100] {
    let mut board = empty_board();
    board = place_horizontal_ship(board, 0, 0, 5); // Carrier
    board = place_horizontal_ship(board, 2, 0, 4); // Battleship
    board = place_horizontal_ship(board, 4, 0, 3); // Cruiser
    board = place_horizontal_ship(board, 6, 0, 3); // Submarine
    board = place_horizontal_ship(board, 8, 0, 2); // Destroyer
    board
}

// Helper: Create a valid board with mixed orientations
// Row 1: Carrier (5 cells) horizontal
// Row 3: Battleship (4 cells) horizontal  
// Row 5: Cruiser (3 cells) horizontal
// Col 7, rows 0-2: Submarine (3 cells) vertical
// Col 9, rows 8-9: Destroyer (2 cells) vertical
fn valid_board_mixed() -> [Field; 100] {
    let mut board = empty_board();
    board = place_horizontal_ship(board, 1, 0, 5); // Carrier: row 1, cols 0-4
    board = place_horizontal_ship(board, 3, 0, 4); // Battleship: row 3, cols 0-3
    board = place_horizontal_ship(board, 5, 0, 3); // Cruiser: row 5, cols 0-2
    board = place_vertical_ship(board, 0, 7, 3);   // Submarine: rows 0-2, col 7
    board = place_vertical_ship(board, 8, 9, 2);   // Destroyer: rows 8-9, col 9
    board
}

// ============================================================================
// UNIT TESTS
// ============================================================================

#[test]
fn test_valid_board_horizontal_commits() {
    let board = valid_board_horizontal();
    let salt = 12345;
    let commitment = validate_and_commit(board, salt);
    
    // Should produce a valid commitment (non-zero)
    assert(commitment != 0);
}

#[test]
fn test_valid_board_mixed_orientations() {
    let board = valid_board_mixed();
    let salt = 54321;
    let commitment = validate_and_commit(board, salt);
    
    // Should produce a valid commitment
    assert(commitment != 0);
}

#[test]
fn test_different_salts_produce_different_commitments() {
    let board = valid_board_horizontal();
    let commitment1 = validate_and_commit(board, 111);
    let commitment2 = validate_and_commit(board, 222);
    
    // Same board, different salts -> different commitments
    assert(commitment1 != commitment2);
}

#[test]
fn test_different_boards_produce_different_commitments() {
    let board1 = valid_board_horizontal();
    let board2 = valid_board_mixed();
    let salt = 99999;
    
    let commitment1 = validate_and_commit(board1, salt);
    let commitment2 = validate_and_commit(board2, salt);
    
    // Different boards, same salt -> different commitments
    assert(commitment1 != commitment2);
}

#[test(should_fail)]
fn test_rejects_too_few_ships() {
    // Only 16 cells instead of 17
    let mut board = empty_board();
    board = place_horizontal_ship(board, 0, 0, 5); // Carrier (5)
    board = place_horizontal_ship(board, 2, 0, 4); // Battleship (4)
    board = place_horizontal_ship(board, 4, 0, 3); // Cruiser (3)
    board = place_horizontal_ship(board, 6, 0, 3); // Submarine (3)
    board = place_horizontal_ship(board, 8, 0, 1); // Invalid: only 1 cell
    
    let salt = 123;
    let _ = validate_and_commit(board, salt); // Should fail
}

#[test(should_fail)]
fn test_rejects_too_many_ships() {
    // 18 cells instead of 17
    let mut board = empty_board();
    board = place_horizontal_ship(board, 0, 0, 5); // Carrier (5)
    board = place_horizontal_ship(board, 2, 0, 4); // Battleship (4)
    board = place_horizontal_ship(board, 4, 0, 3); // Cruiser (3)
    board = place_horizontal_ship(board, 6, 0, 3); // Submarine (3)
    board = place_horizontal_ship(board, 8, 0, 3); // Invalid: 3 instead of 2
    
    let salt = 123;
    let _ = validate_and_commit(board, salt); // Should fail
}

#[test(should_fail)]
fn test_rejects_wrong_ship_configuration() {
    // 17 cells but wrong ship sizes (three ships of length 3, missing others)
    let mut board = empty_board();
    board = place_horizontal_ship(board, 0, 0, 3);
    board = place_horizontal_ship(board, 2, 0, 3);
    board = place_horizontal_ship(board, 4, 0, 3);
    board = place_horizontal_ship(board, 6, 0, 4);
    board = place_horizontal_ship(board, 8, 0, 4);
    
    let salt = 123;
    let _ = validate_and_commit(board, salt); // Should fail
}

#[test(should_fail)]
fn test_rejects_single_cell_ship() {
    // Truly isolated single cells (not adjacent)
    let mut board = empty_board();
    board = place_horizontal_ship(board, 0, 0, 5); // Carrier
    board = place_horizontal_ship(board, 2, 0, 4); // Battleship
    board = place_horizontal_ship(board, 4, 0, 3); // Cruiser
    board = place_horizontal_ship(board, 6, 0, 3); // Submarine
    board[85] = 1; // Single isolated cell at row 8, col 5
    board[97] = 1; // Single isolated cell at row 9, col 7
    
    let salt = 123;
    let _ = validate_and_commit(board, salt); // Should fail
}

#[test(should_fail)]
fn test_rejects_invalid_cell_value() {
    // Cell value is not 0 or 1
    let mut board = valid_board_horizontal();
    board[50] = 2; // Invalid value
    
    let salt = 123;
    let _ = validate_and_commit(board, salt); // Should fail
}
