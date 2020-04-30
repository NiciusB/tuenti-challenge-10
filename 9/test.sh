#!/bin/bash

function hex() {
    printf '%02X\n' $1
}
function encrypt() {
    key=$1
    msg=$2
    crpt_msg=""
    for ((i=0; i<${#msg}; i++)); do
        c=${msg:$i:1}
        asc_chr=$(echo -ne "$c" | od -An -tuC)
        key_pos=$((${#key} - 1 - ${i}))
        key_char=${key:$key_pos:1}
        crpt_chr=$(( $asc_chr ^ ${key_char} ))
        hx_crpt_chr=$(hex $crpt_chr)
        crpt_msg=${crpt_msg}${hx_crpt_chr}
    done
    echo $crpt_msg
}
function un_hex() {
    printf $(( 16#$1 ))
}
function decrypt_key() {
    msg=$1
    crpt_msg=$2
    key=""
    for ((i=0; i<${#msg}; i++)); do
        c=${msg:$i:1}
        asc_chr=$(echo -ne "$c" | od -An -tuC)
        hx_crpt_chr=${crpt_msg:$i*2:2}
        crpt_chr=$(un_hex $hx_crpt_chr)
        key_char=$(( $asc_chr ^ $crpt_chr ))
        key=${key_char}${key}
    done
    echo $key
}
function decrypt_message() {
    key=$1
    crpt_msg=$2
    msg=""
    for ((i=0; i<${#key}; i++)); do
        key_pos=$((${#key} - 1 - ${i}))
        key_char=${key:$key_pos:1}
        hx_crpt_chr=${crpt_msg:$i*2:2}
        crpt_chr=$(un_hex $hx_crpt_chr)
        c=$(( $key_char ^ $crpt_chr ))
        asc_chr=$(hex $c)
        asc_chr=$(echo -e "\u$asc_chr")
        msg=${msg}${asc_chr}
    done
    echo $msg
}


echo "decrypting key"
echo $(decrypt_key "514;248;980;347;145;332" 3633363A33353B393038383C363236333635313A353336)
# key used to encrypt first message: 40614178165780923111223

echo "decrypting message"
echo $(decrypt_message 40614178165780923111223 3A3A333A333137393D39313C3C3634333431353A37363D)
# new coordinates: 981;204;499;905;301;169
