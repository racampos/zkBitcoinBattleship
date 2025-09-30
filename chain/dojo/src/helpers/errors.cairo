// errors.cairo - Cairo 2.12 compatible error handling

pub fn require(cond: bool, code: felt252) {
    if !cond {
        let mut data: Array<felt252> = array![];
        data.append(code);
        core::panic_with_felt252(code);
    }
}
