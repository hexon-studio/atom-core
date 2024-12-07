import { BN } from "bn.js";
import { Effect } from "effect";
import { computeDepositAmount } from ".";
import { noopPublicKey } from "../../../../../constants/tokens";

const compute = computeDepositAmount({
	cargoPodKind: "ammo_bank",
	resourceMint: noopPublicKey,
	starbaseAddress: noopPublicKey,
});

describe("computeDepositAmout", () => {
	describe("Fixed mode", () => {
		it("returns the fixed amout if have space in fleet and have enough tokens in starbase", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "fixed",
					value: new BN(100),
					resourceFleetMaxCap: new BN(100),
					resourceAmountInFleet: new BN(0),
					resourceAmountInStarbase: new BN(1000),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("100");
		});

		it("returns a FleetNotEnoughSpaceError if fleet have not enough space", async () => {
			const result = await Effect.runPromiseExit(
				compute({
					mode: "fixed",
					value: new BN(100),
					resourceFleetMaxCap: new BN(99),
					resourceAmountInFleet: new BN(0),
					resourceAmountInStarbase: new BN(1000),
					totalResourcesAmountInFleet: new BN(0),
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
				      "_tag": "FleetNotEnoughSpaceError",
				      "amountAdded": "100",
				      "amountAvailable": "99",
				      "cargoKind": "ammo_bank",
				    },
				  },
				}
			`);
		});

		it("returns a StarbaseResourceNotEnoughError if fleet have not enough resource in starbase", async () => {
			const result = await Effect.runPromiseExit(
				compute({
					mode: "fixed",
					value: new BN(100),
					resourceFleetMaxCap: new BN(100),
					resourceAmountInFleet: new BN(0),
					resourceAmountInStarbase: new BN(99),
					totalResourcesAmountInFleet: new BN(0),
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
				      "amountAvailable": "99",
				      "entity": "11111111111111111111111111111111",
				      "from": "starbase",
				      "resourceMint": "11111111111111111111111111111111",
				    },
				  },
				}
			`);
		});
	});

	describe("Cap mode", () => {
		it("returns 0 if the amout in fleet is more or equal to value", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "max",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(101),
					resourceAmountInStarbase: new BN(0),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("0");

			const result2 = await Effect.runPromise(
				compute({
					mode: "max",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(100),
					resourceAmountInStarbase: new BN(0),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result2).toBe("0");
		});

		it("returns the missing quantity to reach the max", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "max",
					value: new BN(100),
					resourceFleetMaxCap: new BN(100),
					resourceAmountInFleet: new BN(50),
					resourceAmountInStarbase: new BN(100),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("50");
		});

		it("returns the starbase remaining quantity if less the needed quantity to reach the max", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "max",
					value: new BN(100),
					resourceFleetMaxCap: new BN(100),
					resourceAmountInFleet: new BN(50),
					resourceAmountInStarbase: new BN(23),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("23");
		});
	});

	describe("Min mode", () => {
		it("returns 0 if the amout in fleet is more or equal to value", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "min",
					value: new BN(100),
					resourceFleetMaxCap: new BN(50),
					resourceAmountInFleet: new BN(100),
					resourceAmountInStarbase: new BN(0),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("0");
		});

		it("returns ResourceNotEnoughError if the amount needed is more than the starbase resource amount", async () => {
			const result = await Effect.runPromiseExit(
				compute({
					mode: "min",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(50),
					resourceAmountInStarbase: new BN(49),
					totalResourcesAmountInFleet: new BN(0),
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
				      "amountAdded": "50",
				      "amountAvailable": "49",
				      "entity": "11111111111111111111111111111111",
				      "from": "starbase",
				      "resourceMint": "11111111111111111111111111111111",
				    },
				  },
				}
			`);
		});

		it("returns ResourceNotEnoughError if the amount needed is more than the free available space in fleet", async () => {
			const result = await Effect.runPromiseExit(
				compute({
					mode: "min",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(50),
					resourceAmountInStarbase: new BN(1000),
					totalResourcesAmountInFleet: new BN(951),
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
				      "_tag": "FleetNotEnoughSpaceError",
				      "amountAdded": "50",
				      "amountAvailable": "49",
				      "cargoKind": "ammo_bank",
				    },
				  },
				}
			`);
		});

		it("returns the needed amount if possible", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "min",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(50),
					resourceAmountInStarbase: new BN(1000),
					totalResourcesAmountInFleet: new BN(50),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("50");
		});
	});

	describe("Min and fill mode", () => {
		it("returns StarbaseResourceNotEnoughError if have not min quantity in starbase and in fleet", async () => {
			const result = await Effect.runPromiseExit(
				compute({
					mode: "min-and-fill",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(50),
					resourceAmountInStarbase: new BN(49),
					totalResourcesAmountInFleet: new BN(0),
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
				      "amountAdded": "50",
				      "amountAvailable": "49",
				      "entity": "11111111111111111111111111111111",
				      "from": "starbase",
				      "resourceMint": "11111111111111111111111111111111",
				    },
				  },
				}
			`);
		});

		it("returns 0 if have min quantity in fleet", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "min-and-fill",
					value: new BN(99),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(100),
					resourceAmountInStarbase: new BN(1000),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("0");

			const result2 = await Effect.runPromise(
				compute({
					mode: "min-and-fill",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(100),
					resourceAmountInStarbase: new BN(1000),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result2).toBe("0");
		});

		it("returns the amount for filling the space if have enough resource in starbase", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "min-and-fill",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(0),
					resourceAmountInStarbase: new BN(1001),
					totalResourcesAmountInFleet: new BN(50),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("950");
		});

		it("returns the max amount in starbase if less than fleet max capacity", async () => {
			const result = await Effect.runPromise(
				compute({
					mode: "min-and-fill",
					value: new BN(100),
					resourceFleetMaxCap: new BN(1000),
					resourceAmountInFleet: new BN(50),
					resourceAmountInStarbase: new BN(666),
					totalResourcesAmountInFleet: new BN(0),
				}).pipe(Effect.map((x) => x.toString())),
			);

			expect(result).toBe("666");
		});
	});
});
