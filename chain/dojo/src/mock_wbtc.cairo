// mock_wbtc.cairo - Mock Wrapped Bitcoin ERC20 for local testing (Katana only)
// Mintable by anyone for easy testing
// NOTE: This is ONLY used on Katana. Sepolia/Mainnet use real WBTC contracts.

use starknet::ContractAddress;

#[starknet::interface]
pub trait IMockWBTC<TContractState> {
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
}

#[dojo::contract]
pub mod mock_wbtc {
    use super::IMockWBTC;
    use starknet::ContractAddress;
    use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    #[abi(embed_v0)]
    impl ERC20Impl = ERC20Component::ERC20Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC20MetadataImpl = ERC20Component::ERC20MetadataImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC20CamelOnlyImpl = ERC20Component::ERC20CamelOnlyImpl<ContractState>;

    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
    }

    // Dojo init function (no params for auto-initialization)
    fn dojo_init(ref self: ContractState) {
        // Initialize with WBTC metadata (8 decimals like real Bitcoin)
        self.erc20.initializer("Mock Wrapped Bitcoin", "WBTC");
    }

    #[abi(embed_v0)]
    impl MockWBTCImpl of IMockWBTC<ContractState> {
        // Public mint function - anyone can mint for testing
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            self.erc20.mint(to, amount);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}

