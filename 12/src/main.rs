extern crate num;

/*
    The hardcoded numbers were retrieved using javascript, but it's not interesting enough to include it here in a comment
    I also did a working implementation in JS, but it's way slower
*/
/*
Cargo.toml:

[package]
name = "hello-rust"
version = "0.1.0"
authors = ["NiciusB <nuno@balbona.me>"]
edition = "2018"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
num-bigint="0.2.6"
num-traits="0.2.11"
num="0.2.1"
*/


fn main() {
    use crate::num::Integer;
    use num::bigint::BigUint;
    use num::pow::pow;

    let exponent: usize = 65537;
    let plaintext_1_num: u128 = 85122767101859853816263690; // BigUint::parse_bytes(b"85122767101859853816263690", 10);
    let plaintext_2_num: u128 = 25809826892777633053572363274;  // BigUint::parse_bytes(b"25809826892777633053572363274", 10);
    let ciphered_1_num = BigUint::parse_bytes(b"86415799265826550346135260319570701562479039615893157960026071406615389631006575599457215078371219103485119991139912079856682895330891701130092018044344228075186998137421489079529714567196523725244591136913641070171352133351245719898983928926812166298213911191453999602323417032990871739852902639566452356625", 10);
    let ciphered_2_num = BigUint::parse_bytes(b"23016648152949948767886716216539024618243914420925089957840654501241709613626487782794831246739467894840615376060605814175625515546817051021816536145797434291492656767424554970008632395726884617213697582911264361072824202500634257113768012529485396850373126247137974426317064227160206055340241122720284945546", 10);
   
    let plain_text_1_powered = pow(BigUint::from(plaintext_1_num), exponent);
    let plain_text_2_powered = pow(BigUint::from(plaintext_2_num), exponent);

    let num1 = plain_text_1_powered - ciphered_1_num.unwrap();
    let num2 = plain_text_2_powered - ciphered_2_num.unwrap();
    let result = num1.gcd(&num2);
    println!("{}", result);
}
