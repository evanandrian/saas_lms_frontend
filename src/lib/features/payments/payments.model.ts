export type PlatformPaymentSummary = {
	id: string;
	invoice_id: string;
	tenant_code: string;
	tenant_name: string;
	invoice_number: string;
	amount_idr: number;
	method: string;
	status: string;
	paid_at: string;
	created_at: string;
	bank_account: string;
	reference: string;
	has_proof: boolean;
	proof_name: string;
	verifier_name: string;
	verified_at: string;
	reject_reason: string;
};

export type PlatformPaymentList = {
	items: PlatformPaymentSummary[];
};

export type UnpaidInvoice = {
	id: string;
	invoice_number: string;
	tenant_name: string;
	total_idr: number;
	paid_amount_idr: number;
	due_at: string;
};

export type UnpaidInvoiceList = {
	items: UnpaidInvoice[];
};
