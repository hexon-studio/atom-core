import { BN } from "bn.js";
import { Effect } from "effect";
import { computeWithdrawAmount } from ".";
import { noopPublicKey } from "../../../../../constants/tokens";

const compute = computeWithdrawAmount({
	resourceMint: noopPublicKey,
	fleetAddress: noopPublicKey,
});

describe("computeWithdrawAmount", () => {
	describe("Fixed mode", () => {
		it("returns the fixed amout if have space in fleet and have enough tokens in starbase", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "fixed",
					value: new BN(100),
					resourceFleetMaxCap: new BN(100),
					resourceAmountInFleet: new BN(102),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("100");
		});

		it("returns a ResourceNotEnoughError if fleet have not enough resource to unload", async () => {
			const result = await Effect.runPromiseExit(
				compute({
					mode: "fixed",
					value: new BN(100),
					resourceFleetMaxCap: new BN(99),
					resourceAmountInFleet: new BN(0),
				}),
			);

			expect(result).toMatchInlineSnapshot(`
				{
				  "_id": "Exit",
				  "_tag": "Failure",
				  "cause": {
				    "_id": "Cause",
				    "_tag": "Fail",
				    "failure": {
				      "_tag": "ResourceNotEnoughError",
				      "amountAdded": "100",
				      "amountAvailable": "0",
				      "entity": "11111111111111111111111111111111",
				      "from": "fleet",
				      "resourceMint": "11111111111111111111111111111111",
				    },
				  },
				}
			`);
		});
	});

	describe("Max mode", () => {
		it("returns the max  amoutn in fleet less then the max value", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "max",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(50),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toMatchInlineSnapshot(`"50"`);
		});

		it("returns the exact max value if more resource are inside the fleet", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "max",
					value: new BN(100),
					resourceFleetMaxCap: new BN(100),
					resourceAmountInFleet: new BN(101),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("100");
		});
	});
});
