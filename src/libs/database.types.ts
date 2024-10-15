export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			accounts: {
				Row: {
					created_at: string;
					id: number;
					last_login: string | null;
					pbk: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string;
					id?: number;
					last_login?: string | null;
					pbk: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string;
					id?: number;
					last_login?: string | null;
					pbk?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			action_queues: {
				Row: {
					active_plans_id: number | null;
					created_at: string;
					id: number;
					status: Database["public"]["Enums"]["action_queue_status"] | null;
				};
				Insert: {
					active_plans_id?: number | null;
					created_at?: string;
					id?: number;
					status?: Database["public"]["Enums"]["action_queue_status"] | null;
				};
				Update: {
					active_plans_id?: number | null;
					created_at?: string;
					id?: number;
					status?: Database["public"]["Enums"]["action_queue_status"] | null;
				};
				Relationships: [
					{
						foreignKeyName: "action_queues_active_plans_id_fkey";
						columns: ["active_plans_id"];
						isOneToOne: false;
						referencedRelation: "active_plans";
						referencedColumns: ["id"];
					},
				];
			};
			actions: {
				Row: {
					action_type: Database["public"]["Enums"]["action_types"] | null;
					cargo_mint: string | null;
					cargo_type: string | null;
					created_at: string;
					created_by: number | null;
					destination_sector: string | null;
					id: number;
					mine_resource: string | null;
					movement_type: string | null;
					parent: number | null;
					position: number | null;
					quantity: number | null;
					rearm: boolean | null;
					refood: boolean | null;
					refuel: boolean | null;
					routes_id: number | null;
					sector: string | null;
					updated_at: string | null;
				};
				Insert: {
					action_type?: Database["public"]["Enums"]["action_types"] | null;
					cargo_mint?: string | null;
					cargo_type?: string | null;
					created_at?: string;
					created_by?: number | null;
					destination_sector?: string | null;
					id?: number;
					mine_resource?: string | null;
					movement_type?: string | null;
					parent?: number | null;
					position?: number | null;
					quantity?: number | null;
					rearm?: boolean | null;
					refood?: boolean | null;
					refuel?: boolean | null;
					routes_id?: number | null;
					sector?: string | null;
					updated_at?: string | null;
				};
				Update: {
					action_type?: Database["public"]["Enums"]["action_types"] | null;
					cargo_mint?: string | null;
					cargo_type?: string | null;
					created_at?: string;
					created_by?: number | null;
					destination_sector?: string | null;
					id?: number;
					mine_resource?: string | null;
					movement_type?: string | null;
					parent?: number | null;
					position?: number | null;
					quantity?: number | null;
					rearm?: boolean | null;
					refood?: boolean | null;
					refuel?: boolean | null;
					routes_id?: number | null;
					sector?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "actions_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "accounts";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "actions_parent_fkey";
						columns: ["parent"];
						isOneToOne: false;
						referencedRelation: "actions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "actions_routes_id_fkey";
						columns: ["routes_id"];
						isOneToOne: false;
						referencedRelation: "routes";
						referencedColumns: ["id"];
					},
				];
			};
			active_plans: {
				Row: {
					created_at: string;
					id: number;
					plans_id: number | null;
					remaining_cycles: number | null;
					status: Database["public"]["Enums"]["active_plans_status"] | null;
				};
				Insert: {
					created_at?: string;
					id?: number;
					plans_id?: number | null;
					remaining_cycles?: number | null;
					status?: Database["public"]["Enums"]["active_plans_status"] | null;
				};
				Update: {
					created_at?: string;
					id?: number;
					plans_id?: number | null;
					remaining_cycles?: number | null;
					status?: Database["public"]["Enums"]["active_plans_status"] | null;
				};
				Relationships: [
					{
						foreignKeyName: "active_plans_plans_id_fkey";
						columns: ["plans_id"];
						isOneToOne: false;
						referencedRelation: "plans";
						referencedColumns: ["id"];
					},
				];
			};
			logs: {
				Row: {
					accounts_id: number | null;
					created_at: string;
					id: number;
					message: string | null;
					plans_id: number | null;
				};
				Insert: {
					accounts_id?: number | null;
					created_at?: string;
					id?: number;
					message?: string | null;
					plans_id?: number | null;
				};
				Update: {
					accounts_id?: number | null;
					created_at?: string;
					id?: number;
					message?: string | null;
					plans_id?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "logs_accounts_id_fkey";
						columns: ["accounts_id"];
						isOneToOne: false;
						referencedRelation: "accounts";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "logs_plans_id_fkey";
						columns: ["plans_id"];
						isOneToOne: false;
						referencedRelation: "plans";
						referencedColumns: ["id"];
					},
				];
			};
			plans: {
				Row: {
					created_at: string;
					created_by: number | null;
					cycles: number | null;
					description: string | null;
					fleet_pbk: string | null;
					id: number;
					routes_id: number | null;
					title: string | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: number | null;
					cycles?: number | null;
					description?: string | null;
					fleet_pbk?: string | null;
					id?: number;
					routes_id?: number | null;
					title?: string | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: number | null;
					cycles?: number | null;
					description?: string | null;
					fleet_pbk?: string | null;
					id?: number;
					routes_id?: number | null;
					title?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "plans_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "accounts";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "plans_routes_id_fkey";
						columns: ["routes_id"];
						isOneToOne: false;
						referencedRelation: "routes";
						referencedColumns: ["id"];
					},
				];
			};
			routes: {
				Row: {
					created_at: string;
					created_by: number | null;
					description: string | null;
					id: number;
					last_action_sector: string | null;
					start_sector: string | null;
					title: string | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: number | null;
					description?: string | null;
					id?: number;
					last_action_sector?: string | null;
					start_sector?: string | null;
					title?: string | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: number | null;
					description?: string | null;
					id?: number;
					last_action_sector?: string | null;
					start_sector?: string | null;
					title?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "activities_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "accounts";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			log_rls_policy_auth: {
				Args: {
					pbk: string;
					role: string;
					table_name: string;
					action: string;
				};
				Returns: undefined;
			};
		};
		Enums: {
			action_queue_status: "idle" | "running" | "waiting" | "done" | "error";
			action_types:
				| "load_cargo"
				| "unload_cargo"
				| "start_mining"
				| "trip"
				| "crafting";
			active_plans_status: "idle" | "running";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
	PublicTableNameOrOptions extends
		| keyof (PublicSchema["Tables"] & PublicSchema["Views"])
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
				Database[PublicTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
			Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
				PublicSchema["Views"])
		? (PublicSchema["Tables"] &
				PublicSchema["Views"])[PublicTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	PublicEnumNameOrOptions extends
		| keyof PublicSchema["Enums"]
		| { schema: keyof Database },
	EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
	? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
		? PublicSchema["Enums"][PublicEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof PublicSchema["CompositeTypes"]
		| { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
	? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
		? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;
