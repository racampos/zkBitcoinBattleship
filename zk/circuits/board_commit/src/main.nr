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

                    // Count ship length
                    let mut len: Field = 1;
                    
                    if right == 1 {
                        // Horizontal ship
                        for offset in 1..10 {
                            if (c + offset < 10) {
                                if board[index + offset] == 1 {
                                    len += 1;
                                }
                            }
                        }
                    } else {
                        // Vertical ship
                        for offset in 1..10 {
                            if (r + offset < 10) {
                                if board[index + offset * 10] == 1 {
                                    len += 1;
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
