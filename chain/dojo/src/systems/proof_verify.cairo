// proof_verify.cairo - Shot proof verification and application
// Currently using MOCK verifier - will be replaced with Garaga verifier

#[starknet::interface]
pub trait IProofVerify<T> {
    fn apply_shot_proof(
        ref self: T,
        game_id: felt252,
        x: u8,
        y: u8,
        result: u8,
        nullifier: felt252,
        rules_hash: felt252,
        proof: Span<felt252>
    );
}

#[dojo::contract]
pub mod proof_verify {
    use super::IProofVerify;
    use starknet::{get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use crate::{Game, GameStatus, PendingShot, Shot, NullifierSet, BoardCommit};
    use crate::helpers::errors;
    use crate::helpers::get_opt::get_opt_nullifier;
    use crate::helpers::game_helpers::{
        get_defender_address, get_attacker_address, get_game_rules_hash, apply_hit_and_check_win,
        finalize_win
    };

    // MOCK VERIFIER - Replace with Garaga verifier later
    fn mock_verify_shot_result(
        proof: Span<felt252>,
        commitment: felt252,
        rules_hash: felt252,
        game_id: felt252,
        defender: felt252,
        x: felt252,
        y: felt252,
        result: felt252,
        nullifier: felt252
    ) -> bool {
        // TODO: Replace with real Garaga verifier
        // For now, always return true for development
        true
    }

    #[abi(embed_v0)]
    impl ProofVerifyImpl of IProofVerify<ContractState> {
        fn apply_shot_proof(
            ref self: ContractState,
            game_id: felt252,
            x: u8,
            y: u8,
            result: u8,
            nullifier: felt252,
            rules_hash: felt252,
            proof: Span<felt252>
        ) {
            let mut world = self.world_default();
            let g: Game = world.read_model(game_id);

            // Guard: game must be started
            errors::require(g.status == GameStatus::Started, 'NOT_STARTED');

            let defender = get_defender_address(world, game_id);
            let attacker = get_attacker_address(world, game_id);

            // Bind to pending shot (prevent arbitrary coordinates)
            let ps: PendingShot = world.read_model((game_id, g.turn_no));
            errors::require(ps.turn_no == g.turn_no, 'STALE_PENDING_SHOT');
            errors::require(ps.shooter == attacker, 'WRONG_SHOOTER');
            errors::require(ps.x == x && ps.y == y, 'WRONG_COORDS');

            // Only defender can provide shot result
            errors::require(get_caller_address() == defender, 'ONLY_DEFENDER');

            let bc: BoardCommit = world.read_model((game_id, defender));
            let commitment = bc.commitment;

            // Verify proof (currently mock)
            errors::require(
                mock_verify_shot_result(
                    proof,
                    commitment,
                    rules_hash,
                    game_id,
                    defender.into(),
                    x.into(),
                    y.into(),
                    result.into(),
                    nullifier
                ),
                'INVALID_SHOT_PROOF'
            );

            // Lock rules to game
            let game_rules_hash = get_game_rules_hash(world, game_id);
            errors::require(rules_hash == game_rules_hash, 'RULES_CHANGED');

            // Nullifier replay guard
            errors::require(nullifier != 0, 'BAD_NULLIFIER');
            errors::require(
                get_opt_nullifier(world, game_id, nullifier).is_none(),
                'REPLAY'
            );

            // Write shot at CURRENT turn for consistency
            let shot = Shot { game_id, turn_no: g.turn_no, x, y, result };
            world.write_model(@shot);

            let nullifier_set = NullifierSet { game_id, nullifier, used: true };
            world.write_model(@nullifier_set);

            // TODO: Emit ShotResolved event

            // CRITICAL: Apply hit & check win BEFORE flipping turn
            let did_win = apply_hit_and_check_win(world, game_id, defender, x, y, result);

            // Consume the pending shot
            let pending_to_delete = PendingShot {
                game_id,
                turn_no: ps.turn_no,
                shooter: 0.try_into().unwrap(),
                x: 0,
                y: 0
            };
            world.erase_model(@pending_to_delete);

            if did_win {
                finalize_win(world, game_id, attacker); // award to current (pre-flip) attacker
                return;
            }

            // Otherwise, flip turn & bump timer
            let mut g2 = g;
            g2.turn_player = defender; // defender becomes next attacker
            g2.turn_no += 1; // increment turn for next shot
            g2.last_action = get_block_timestamp();
            world.write_model(@g2);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}


