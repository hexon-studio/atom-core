import type { PublicKey } from "@solana/web3.js";

type EstimatedFees = {
	"50": number;
	"75": number;
	"95": number;
};

const percentilesSettings = {
	low: { name: "50", maxMicroLamports: 25_000 },
	medium: { name: "75", maxMicroLamports: 50_000 },
	high: { name: "95", maxMicroLamports: 100_000 },
} as const;

export const getEstimatedTransactionFee = async ({
	hellomoonRpcUrl,
	writableAccounts,
	feeMode,
}: {
	hellomoonRpcUrl: string;
	feeMode: keyof typeof percentilesSettings;
	writableAccounts: PublicKey[];
}): Promise<{ microLamports: number }> => {
	try {
		const response = await fetch(hellomoonRpcUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "getPrioritizationFee",
				params: {
					writableAccounts: writableAccounts.map((account) =>
						account.toString(),
					),
					percentiles: [50, 75, 95],
					lookbackSlots: 100,
				},
			}),
		}).then(
			async (response) =>
				response.json() as Promise<{
					result: {
						percentileToFee: EstimatedFees;
					};
				}>,
		);

		const percentileSettings = percentilesSettings[feeMode];

		const microLamports =
			response.result.percentileToFee[percentileSettings.name];

		console.log("Using estimated fee", microLamports, "microlamports");

		return {
			microLamports: Math.min(
				microLamports,
				percentileSettings.maxMicroLamports,
			),
		};
	} catch (e) {
		console.log("Get fee error", e);

		return { microLamports: 0 };
	}
};
