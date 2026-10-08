export interface TenantResponse {
	id: string;
	code: string;
	name: string;
	lifecycle_status: string;
	npsn: string | null;
	type: string;
	created_at: string;
	email: string | null;
	phone: string | null;
	address: string;
	timezone: string | null;
	contact_name: string | null;
	seat_count: number | null;
	billing_cycle: string | null;
	plan_name: string | null;
	plan_price: number | null;
	plan_tax_mode: string | null;
}
