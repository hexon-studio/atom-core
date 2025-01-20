import type { PublicKey } from "@solana/web3.js";
import type { FeeMode } from "~/types";

const feeModeToHeliusFeeMode = {
	low: "Low",
	medium: "Medium",
	high: "High",
} as const;

export const getHeliusEstimatedTransactionFee = async ({
	heliusRpcUrl,
	writableAccounts,
	feeMode,
}: {
	writableAccounts: PublicKey[];
	heliusRpcUrl: string;
	feeMode: FeeMode;
}) => {
	try {
		// Getting estimated fees from helius
		const response = await fetch(heliusRpcUrl, {
			method: "POST",
			signal: AbortSignal.timeout(10_000),
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: "1",
				method: "getPriorityFeeEstimate",
				params: [
					{
						accountKeys: writableAccounts.map((p) => p.toString()),
						options: {
							priorityLevel: feeModeToHeliusFeeMode[feeMode],
							// recommended: true,
						},
					},
				],
			}),
		}).then(
			(response) =>
				response.json() as Promise<{
					result: { priorityFeeEstimate: number };
				}>,
		);

		console.log("Helius estimated fees", response.result.priorityFeeEstimate);

		return response.result.priorityFeeEstimate;
	} catch (e) {
		console.log("Error getting helius estimated fees, using exact fee", e);

		return 0;
	}
};
