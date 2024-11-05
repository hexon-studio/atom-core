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
			actions: {
				Row: {
					action_type: Database["public"]["Enums"]["action_types"] | null;
					cargo_data: Json | null;
					cargo_mint: string | null;
					cargo_type: string | null;
					created_at: string;
					created_by: number | null;
					destination_sector: string | null;
					id: number;
					mine_resource: string | null;
					mining_data: Json | null;
					movement_type: string | null;
					parent: number | null;
					position: number | null;
					quantity: number | null;
					rearm: boolean | null;
					rearm_amount: number | null;
					refood: boolean | null;
					refood_amount: number | null;
					refuel: boolean | null;
					refuel_amount: number | null;
					routes_id: number | null;
					sector: string | null;
					trip_data: Json | null;
					updated_at: string;
				};
				Insert: {
					action_type?: Database["public"]["Enums"]["action_types"] | null;
					cargo_data?: Json | null;
					cargo_mint?: string | null;
					cargo_type?: string | null;
					created_at?: string;
					created_by?: number | null;
					destination_sector?: string | null;
					id?: number;
					mine_resource?: string | null;
					mining_data?: Json | null;
					movement_type?: string | null;
					parent?: number | null;
					position?: number | null;
					quantity?: number | null;
					rearm?: boolean | null;
					rearm_amount?: number | null;
					refood?: boolean | null;
					refood_amount?: number | null;
					refuel?: boolean | null;
					refuel_amount?: number | null;
					routes_id?: number | null;
					sector?: string | null;
					trip_data?: Json | null;
					updated_at?: string;
				};
				Update: {
					action_type?: Database["public"]["Enums"]["action_types"] | null;
					cargo_data?: Json | null;
					cargo_mint?: string | null;
					cargo_type?: string | null;
					created_at?: string;
					created_by?: number | null;
					destination_sector?: string | null;
					id?: number;
					mine_resource?: string | null;
					mining_data?: Json | null;
					movement_type?: string | null;
					parent?: number | null;
					position?: number | null;
					quantity?: number | null;
					rearm?: boolean | null;
					rearm_amount?: number | null;
					refood?: boolean | null;
					refood_amount?: number | null;
					refuel?: boolean | null;
					refuel_amount?: number | null;
					routes_id?: number | null;
					sector?: string | null;
					trip_data?: Json | null;
					updated_at?: string;
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
			connections: {
				Row: {
					created_at: string;
					id: number;
					routes_id: number | null;
					source_actions_id: number | null;
					target_actions_id: number | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: number;
					routes_id?: number | null;
					source_actions_id?: number | null;
					target_actions_id?: number | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: number;
					routes_id?: number | null;
					source_actions_id?: number | null;
					target_actions_id?: number | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "connections_routes_id_fkey";
						columns: ["routes_id"];
						isOneToOne: false;
						referencedRelation: "routes";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "connections_source_actions_id_fkey";
						columns: ["source_actions_id"];
						isOneToOne: false;
						referencedRelation: "actions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "connections_target_actions_id_fkey";
						columns: ["target_actions_id"];
						isOneToOne: false;
						referencedRelation: "actions";
						referencedColumns: ["id"];
					},
				];
			};
			executions: {
				Row: {
					created_at: string;
					duration: number | null;
					id: number;
					routes_id: number | null;
					status: Database["public"]["Enums"]["execution_status"] | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string;
					duration?: number | null;
					id?: number;
					routes_id?: number | null;
					status?: Database["public"]["Enums"]["execution_status"] | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string;
					duration?: number | null;
					id?: number;
					routes_id?: number | null;
					status?: Database["public"]["Enums"]["execution_status"] | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "executions_routes_id_fkey";
						columns: ["routes_id"];
						isOneToOne: false;
						referencedRelation: "routes";
						referencedColumns: ["id"];
					},
				];
			};
			hot_wallets: {
				Row: {
					created_at: string;
					created_by: number | null;
					id: number;
					permissions: Json | null;
					pubkey: string | null;
					secrets_id: string | null;
					setup_completed: boolean;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					created_by?: number | null;
					id?: number;
					permissions?: Json | null;
					pubkey?: string | null;
					secrets_id?: string | null;
					setup_completed?: boolean;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					created_by?: number | null;
					id?: number;
					permissions?: Json | null;
					pubkey?: string | null;
					secrets_id?: string | null;
					setup_completed?: boolean;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "hot_wallets_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "accounts";
						referencedColumns: ["id"];
					},
				];
			};
			http_request_tracker: {
				Row: {
					body: Json | null;
					headers: Json | null;
					method: string | null;
					params: Json | null;
					request_id: number | null;
					url: string | null;
				};
				Insert: {
					body?: Json | null;
					headers?: Json | null;
					method?: string | null;
					params?: Json | null;
					request_id?: number | null;
					url?: string | null;
				};
				Update: {
					body?: Json | null;
					headers?: Json | null;
					method?: string | null;
					params?: Json | null;
					request_id?: number | null;
					url?: string | null;
				};
				Relationships: [];
			};
			routes: {
				Row: {
					created_at: string;
					created_by: number | null;
					cycles: number | null;
					description: string | null;
					end_hour: string | null;
					fleet: string | null;
					id: number;
					last_action_sector: string | null;
					player_profile: string | null;
					start_hour: string | null;
					start_sector: string | null;
					status: Database["public"]["Enums"]["route_status"] | null;
					title: string | null;
					trigger_type: Database["public"]["Enums"]["trigger_types"] | null;
					updated_at: string | null;
					week_days: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: number | null;
					cycles?: number | null;
					description?: string | null;
					end_hour?: string | null;
					fleet?: string | null;
					id?: number;
					last_action_sector?: string | null;
					player_profile?: string | null;
					start_hour?: string | null;
					start_sector?: string | null;
					status?: Database["public"]["Enums"]["route_status"] | null;
					title?: string | null;
					trigger_type?: Database["public"]["Enums"]["trigger_types"] | null;
					updated_at?: string | null;
					week_days?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: number | null;
					cycles?: number | null;
					description?: string | null;
					end_hour?: string | null;
					fleet?: string | null;
					id?: number;
					last_action_sector?: string | null;
					player_profile?: string | null;
					start_hour?: string | null;
					start_sector?: string | null;
					status?: Database["public"]["Enums"]["route_status"] | null;
					title?: string | null;
					trigger_type?: Database["public"]["Enums"]["trigger_types"] | null;
					updated_at?: string | null;
					week_days?: string | null;
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
			tasks: {
				Row: {
					action_position: number | null;
					action_type: Database["public"]["Enums"]["action_types"] | null;
					cargo_data: Json | null;
					created_at: string;
					duration: number | null;
					error_message: string | null;
					error_tag: string | null;
					executions_id: number | null;
					id: number;
					mining_data: Json | null;
					rearm_amount: number | null;
					refood_amount: number | null;
					refuel_amount: number | null;
					retry_attempts: number | null;
					schedule_expire_at: string | null;
					status: Database["public"]["Enums"]["task_status"] | null;
					transactions: string | null;
					trip_count: number | null;
					trip_data: Json | null;
					updated_at: string | null;
					wait_until: string | null;
				};
				Insert: {
					action_position?: number | null;
					action_type?: Database["public"]["Enums"]["action_types"] | null;
					cargo_data?: Json | null;
					created_at?: string;
					duration?: number | null;
					error_message?: string | null;
					error_tag?: string | null;
					executions_id?: number | null;
					id?: number;
					mining_data?: Json | null;
					rearm_amount?: number | null;
					refood_amount?: number | null;
					refuel_amount?: number | null;
					retry_attempts?: number | null;
					schedule_expire_at?: string | null;
					status?: Database["public"]["Enums"]["task_status"] | null;
					transactions?: string | null;
					trip_count?: number | null;
					trip_data?: Json | null;
					updated_at?: string | null;
					wait_until?: string | null;
				};
				Update: {
					action_position?: number | null;
					action_type?: Database["public"]["Enums"]["action_types"] | null;
					cargo_data?: Json | null;
					created_at?: string;
					duration?: number | null;
					error_message?: string | null;
					error_tag?: string | null;
					executions_id?: number | null;
					id?: number;
					mining_data?: Json | null;
					rearm_amount?: number | null;
					refood_amount?: number | null;
					refuel_amount?: number | null;
					retry_attempts?: number | null;
					schedule_expire_at?: string | null;
					status?: Database["public"]["Enums"]["task_status"] | null;
					transactions?: string | null;
					trip_count?: number | null;
					trip_data?: Json | null;
					updated_at?: string | null;
					wait_until?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "tasks_executions_id_fkey";
						columns: ["executions_id"];
						isOneToOne: false;
						referencedRelation: "executions";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			ordered_actions: {
				Row: {
					action_type: Database["public"]["Enums"]["action_types"] | null;
					calc_position: number | null;
					cargo_data: Json | null;
					cargo_mint: string | null;
					cargo_type: string | null;
					created_at: string | null;
					created_by: number | null;
					destination_sector: string | null;
					id: number | null;
					mine_resource: string | null;
					mining_data: Json | null;
					movement_type: string | null;
					parent: number | null;
					quantity: number | null;
					rearm: boolean | null;
					rearm_amount: number | null;
					refood: boolean | null;
					refood_amount: number | null;
					refuel: boolean | null;
					refuel_amount: number | null;
					routes_id: number | null;
					sector: string | null;
					trip_data: Json | null;
					updated_at: string | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			add_cargo_data_element: {
				Args: {
					p_id: number;
					p_new_element: Json;
				};
				Returns: Json;
			};
			add_mining_data_element: {
				Args: {
					p_id: number;
					p_new_element: Json;
				};
				Returns: Json;
			};
			delete_action: {
				Args: {
					p_routes_id: number;
					p_action_id: number;
				};
				Returns: undefined;
			};
			delete_cargo_data_element: {
				Args: {
					p_id: number;
					p_index: number;
				};
				Returns: Json;
			};
			delete_mining_data_element: {
				Args: {
					p_id: number;
					p_index: number;
				};
				Returns: Json;
			};
			get_ordered_actions: {
				Args: {
					route_id: number;
				};
				Returns: {
					id: number;
					created_at: string;
					cargo_type: string;
					cargo_mint: string;
					quantity: number;
					movement_type: string;
					destination_sector: string;
					action_type: string;
					created_by: number;
					updated_at: string;
					parent: number;
					refuel: boolean;
					rearm: boolean;
					refood: boolean;
					routes_id: number;
					mine_resource: string;
					sector: string;
					cargo_data: Json;
					trip_data: Json;
					mining_data: Json;
					refuel_amount: number;
					rearm_amount: number;
					refood_amount: number;
					calc_position: number;
				}[];
			};
			http_request_wrapper: {
				Args: {
					method: string;
					url: string;
					params?: Json;
					body?: Json;
					headers?: Json;
				};
				Returns: number;
			};
			insert_action: {
				Args: {
					p_created_by: number;
					p_routes_id: number;
					p_action_type: Database["public"]["Enums"]["action_types"];
					p_previous_action_id?: number;
					p_next_action_id?: number;
				};
				Returns: undefined;
			};
			log_rls_policy_auth: {
				Args: {
					pbk: string;
					role: string;
					table_name: string;
					action: string;
				};
				Returns: undefined;
			};
			move_action: {
				Args: {
					p_routes_id: number;
					p_action_id: number;
					p_new_previous_action_id?: number;
					p_new_next_action_id?: number;
				};
				Returns: undefined;
			};
			store_account_secret: {
				Args: {
					accounts_id: number;
					private_key: string;
				};
				Returns: Json;
			};
			store_hot_wallet: {
				Args: {
					accounts_id: number;
					public_key: string;
					secret_key: string;
					permissions: Json;
				};
				Returns: Json;
			};
			update_action_sector: {
				Args: {
					route_id: number;
				};
				Returns: undefined;
			};
			update_cargo_data_element: {
				Args: {
					p_id: number;
					p_index: number;
					p_attributes_to_update: Json;
				};
				Returns: Json;
			};
			update_json_array_field: {
				Args: {
					table_to_update: string;
					record_id: number;
					json_field: string;
					array_id: string;
					key: string;
					new_value: Json;
				};
				Returns: Json;
			};
			update_json_object_field: {
				Args: {
					table_name: string;
					record_id: number;
					json_field_name: string;
					key: string;
					new_value: Json;
				};
				Returns: Json;
			};
			update_mining_data_element: {
				Args: {
					p_id: number;
					p_index: number;
					p_attributes_to_update: Json;
				};
				Returns: Json;
			};
			update_multiple_json_keys: {
				Args: {
					table_to_update: string;
					record_id: number;
					json_field: string;
					array_id: string;
					keys: string[];
					new_values: Json[];
				};
				Returns: Json;
			};
		};
		Enums: {
			action_types:
				| "load_cargo"
				| "unload_cargo"
				| "start_mining"
				| "trip"
				| "crafting";
			execution_status: "success" | "error" | "running" | "paused";
			route_status: "off" | "on";
			task_status:
				| "idle"
				| "scheduled"
				| "running"
				| "waiting"
				| "success"
				| "error"
				| "done";
			trigger_types: "instant" | "schedule";
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
