import { BN } from "bn.js";

export const jsonStringify = (value: unknown) =>
	JSON.stringify(
		value,
		(_, value) => {
			if (/[0-9A-Fa-f]{6}/g.test(value)) {
				try {
					const bn = new BN(Number.parseInt(value, 16));

					return bn.toString();
				} catch {
					return value;
				}
			}

			return value;
		},
		2,
	);
