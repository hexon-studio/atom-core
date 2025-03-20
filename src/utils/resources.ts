import { PublicKey } from "@solana/web3.js";
import { Array as EffectArray, Option, Record, unsafeCoerce } from "effect";
import { noopPublicKey } from "~/constants/tokens";

const resourceMintNameMap = {
	SiLiCA4xKGkyymB5XteUVmUeLqE4JGQTyWBpKFESLgh: "Silica",
	Nitro6idW5JCb2ysUPGUAvVqv3HmUR7NVH7NdybGJ4L: "Nitrogen",
	tiorehR1rLfeATZ96YoByUkvNFsBfUUSQWgSH2mizXL: "TitaniumOre",
	TTNM1SMkM7VKtyPW6CNBZ4cg3An3zzQ8NVLS2HpMaWL: "Titanium",
	aeroBCMu6AX6bCLYd1VQtigqZh8NGSjn54H1YSczHeJ: "Aerogel",
	FiELD9fGaCgiNMfzQKKZD78wxwnBHTwjiiJfsieb6VGb: "FieldStabilizer",
	LUMACqD5LaKjs1AeuJYToybasTXoYQ7YkxJEc4jowNj: "Lumanite",
	PoWRYJnw3YDSyXgNtN3mQ3TKUMoUSsLAbvE8Ejade3u: "PowerSource",
	EMAGoQSP89CJV5focVjrpEuE4CeqJ4k1DouQW7gUu7yX: "Electromagnet",
	HYDR4EPHJcDPcaLYUcNCtrXUdt1PnaN4MvE655pevBYp: "Hydrogen",
	CPPRam7wKuBkYzN5zCffgNU17RKaeMEns4ZD83BqBVNR: "Copper",
	MASS9GqtJz6ABisAxcUn3FeR4phMqH1XfG6LPKJePog: "Biomass",
	FeorejFjRRAfusN9Fg3WjEZ1dRCf74o6xwT5vDt3R34J: "IronOre",
	GRAPHKGoKtXtdPBx17h6fWopdT5tLjfAP8cDJ1SvvDn4: "Graphene",
	CoNDDRCNxXAMGscCdejioDzb6XKxSzonbWb36wzSgp5T: "SuperConductor",
	EMiTWSLgjDVkBbLFaMcGU6QqFWzX9JX6kqs1UtUjsmJA: "StrangeEmitter",
	CARBWKWvxEuMcq3MqCxYfi7UoFVpL9c4rsQS99tw6i4X: "Carbon",
	ironxrUhTEaBiR9Pgp6hy4qWx6V2FirDoXhsFP25GFP: "Iron",
	CUore1tNkiubxSwDEtLc3Ybs1xfWLs8uGjyydUYZ25xc: "CopperOre",
	PTCLSWbwZ3mqZqHAporphY2ofio8acsastaHfoP87Dc: "ParticleAccelerator",
	SDUsgfSZaDhhZ76U3ZgvtFiXsfnHbf2VrzYxjBZ5YbM: "SurveyDataUnit",
	DMNDKqygEN3WXKVrAD4ofkYBc4CKNRhFUbXP4VK7a944: "Diamond",
	HYCBuSWCJ5ZEyANexU94y1BaBPtAX2kzBgGD2vES2t6M: "Hydrocarbon",
	RABSXX6RcqJ1L5qsGY64j91pmbQVbsYRQuw1mmxhxFe: "RadiationAbsorber",
	SUBSVX9LYiPrzHeg2bZrqFSDSKkrQkiCesr6SjtdHaX: "EnergySubstrate",
	FMWKb7YJA5upZHbu5FjVRRoxdDw2FYFAu284VqUGF9C2: "Framework",
	cwirGHLB2heKjCeTy4Mbp4M443fU4V7vy2JouvYbZna: "CopperWire",
	PoLYs2hbRt5iDibrkPT9e6xWuhSS45yZji5ChgJBvcB: "Polymer",
	ELECrjC8m9GxCqcm4XCNpFvkS8fHStAvymS6MJbe3XLZ: "Electronics",
	MAGNMDeDJLvGAnriBvzWruZHfXNwWHhxnoNF75AQYM5: "Magnet",
	CRYSNnUd7cZvVfrEVtVNKmXiCPYdZ1S5pM5qG2FDVZHF: "CrystalLattice",
	STEELXLJ8nfJy3P4aNuGxyNRbWPohqHSwxY75NsJRGG: "Steel",
	ARCoQ9dndpg6wE2rRexzfwgJR3NoWWhpcww3xQcQLukg: "Arco",
	RCH1Zhg4zcSSQK8rw2s6rDMVsgBEWa4kiv1oLFndrN5: "Rochinol",
	fueL3hBZjLLLJHiFH9cqZoozTG3XQZ53diwFPwbzNim: "Fuel",
	foodQJAztMzX1DKpLaiounNe2BDMds5RNuPC6jsNrDG: "Food",
	tooLsNYLiVqzg8o4m3L2Uetbn62mvMWRqkog6PQeYKL: "Toolkit",
	ammoK8AkX2wnebQb35cDAZtTkvsXQbi82cGeTnUvvfK: "Ammunition",
} as const;

type ResourceName =
	(typeof resourceMintNameMap)[keyof typeof resourceMintNameMap];

export const resourceNameByMint = (mint: PublicKey) =>
	Record.get(resourceMintNameMap, unsafeCoerce(mint.toString())).pipe(
		Option.getOrElse(() => "Unknown resource"),
	);

export const resourceMintByName = (name: ResourceName) =>
	EffectArray.findFirst(
		Record.toEntries(resourceMintNameMap),
		([, resourceName]) => resourceName === name,
	).pipe(
		Option.map(([mint]) => new PublicKey(mint)),
		Option.getOrElse(() => noopPublicKey),
	);
