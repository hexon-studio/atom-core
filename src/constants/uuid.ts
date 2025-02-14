import type { PublicKey } from "@solana/web3.js";
import { v5 } from "uuid";
import type { CargoPodKind } from "~/utils/decoders";

const uuidV5Namespace = "cede0066-1e42-4a1f-b845-5bc3aea74896";

export const createItemUuid = ({
	cargoPodKind,
	resourceMint,
}: {
	cargoPodKind: CargoPodKind;
	resourceMint: PublicKey;
}) => v5([cargoPodKind, resourceMint.toString()].join("-"), uuidV5Namespace);
