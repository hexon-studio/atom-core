import { bs58 } from "@staratlas/anchor/dist/cjs/utils/bytes";
import wallet from "../keypairs/hotwallet.json";

console.log(bs58.encode(Uint8Array.from(wallet)));
