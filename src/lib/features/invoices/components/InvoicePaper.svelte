<script lang="ts" module>
	import type { BankAccount, InvoiceStatus } from '../invoices.model';

	export interface PaperLine {
		description: string;
		quantity: number;
		unitLabel: string;
		unitPrice: number;
	}

	/** Data cetakan: draf = isian terkini; invoice terbit = salinan saat terbit (backend). */
	export interface PaperData {
		number: string | null;
		status: InvoiceStatus;
		issuer: {
			company_name: string;
			address: string;
			npwp: string;
			email: string;
			phone: string;
			city: string;
			signer_name: string;
			signer_title: string;
		};
		billTo: { name: string; address: string; pic: string; email: string; tenant_code: string };
		issueDate: string;
		dueDate: string;
		period: string;
		lines: PaperLine[];
		subtotal: number;
		discount: number;
		discountLabel: string;
		dpp: number;
		taxEnabled: boolean;
		tax: number;
		total: number;
		bank: BankAccount | null;
		va: { bank: string; number: string; billerCode: string | null } | null;
		note: string;
	}
</script>

<script lang="ts">
	import logo from '$lib/assets/brand/flixare-core-color.png';
	import { useI18n } from '$lib/i18n';
	import { STAMP_COLOR, longDate, rupiah, terbilang } from '../invoices.model';

	interface Props {
		data: PaperData;
	}

	let { data }: Props = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`invoices.paper.${key}`, params);
	const money = (n: number) => rupiah(n, i18n.locale);
	const fmtQty = (n: number) => n.toLocaleString(i18n.locale === 'en' ? 'en-US' : 'id-ID');
</script>

<!-- Kertas A4 (referensi #inv-paper): warna tetap terang agar hasil cetak/PDF sama di mode gelap. -->
<article
	id="inv-paper"
	class="paper"
	aria-label={t('label', { number: data.number ?? t('draft') })}
>
	<header class="head">
		<div class="issuer">
			<img src={logo} alt="FLIXARE" class="logo" />
			<span class="small">
				{data.issuer.company_name}<br />{data.issuer.address}<br />
				{#if data.issuer.npwp}NPWP {data.issuer.npwp} ·
				{/if}{data.issuer.email}
			</span>
		</div>
		<div class="title">
			<span class="word">INVOICE</span>
			<span class="mono no">{data.number ?? t('draft_number')}</span>
		</div>
	</header>

	<section class="parties">
		<div class="col">
			<span class="kicker">{t('bill_to')}</span>
			<span class="party">{data.billTo.name || '—'}</span>
			<span class="small ink2">{data.billTo.address || '—'}</span>
			<span class="small ink2">u.p. {data.billTo.pic || '—'} · {data.billTo.email || '—'}</span>
		</div>
		<dl class="facts">
			<dt>{t('issue_date')}</dt>
			<dd>{longDate(data.issueDate, i18n.locale)}</dd>
			<dt>{t('due_date')}</dt>
			<dd>{longDate(data.dueDate, i18n.locale)}</dd>
			<dt>{t('period')}</dt>
			<dd>{data.period || '—'}</dd>
			<dt>{t('tenant_code')}</dt>
			<dd class="mono">{data.billTo.tenant_code || '—'}</dd>
		</dl>
	</section>

	<section>
		<div class="row th mono">
			<span>NO</span><span>{t('description')}</span><span class="r">QTY</span><span class="r"
				>{t('price')}</span
			><span class="r">{t('amount')}</span>
		</div>
		{#each data.lines as line, i (i)}
			<div class="row td">
				<span class="faint">{i + 1}</span>
				<span class="strong">{line.description || '—'}</span>
				<span class="r">{fmtQty(line.quantity)} {line.unitLabel}</span>
				<span class="r">{money(line.unitPrice)}</span>
				<span class="r strong">{money(line.quantity * line.unitPrice)}</span>
			</div>
		{/each}
	</section>

	<section class="sums">
		<div class="words">
			<span class="kicker">{t('in_words')}</span>
			<span class="terbilang">{terbilang(data.total)}</span>
			<span class="stamp" style:--stamp={STAMP_COLOR[data.status]}>{t(`stamp_${data.status}`)}</span
			>
		</div>
		<div class="totals">
			<div class="line"><span>Subtotal</span><span>{money(data.subtotal)}</span></div>
			{#if data.discount}
				<div class="line">
					<span>{data.discountLabel}</span><span>−{money(data.discount)}</span>
				</div>
			{/if}
			<div class="line"><span>DPP</span><span>{money(data.dpp)}</span></div>
			<div class="line">
				<span>PPN 11%</span><span>{data.taxEnabled ? money(data.tax) : t('no_tax')}</span>
			</div>
			<div class="grand"><span>TOTAL</span><span>{money(data.total)}</span></div>
		</div>
	</section>

	<section class="howto">
		<div class="col">
			<span class="kicker">{t('how_to_pay')}</span>
			{#if data.bank}
				<span
					>{t('transfer_to')} <b>{data.bank.bank_name}</b>
					{data.bank.account_number}<br />a.n. {data.bank.account_name}</span
				>
			{/if}
			{#if data.va}
				<span
					>{t('or_va', { bank: data.va.bank })}
					<b class="mono">{data.va.number}</b>{#if data.va.billerCode}
						· {t('biller_code', { code: data.va.billerCode })}{/if}</span
				>
			{/if}
		</div>
		<div class="col">
			<span class="kicker">{t('note')}</span>
			<span>{data.note}</span>
		</div>
	</section>

	<div class="grow"></div>

	<footer class="foot">
		<span class="legal">{t('legal', { email: data.issuer.email, phone: data.issuer.phone })}</span>
		<div class="sign">
			<span>{data.issuer.city}, {longDate(data.issueDate, i18n.locale)}</span>
			<span class="signer"
				><b>{data.issuer.signer_name}</b><span class="faint">{data.issuer.signer_title}</span></span
			>
		</div>
	</footer>
</article>

<style>
	.paper {
		width: 100%;
		max-width: 794px;
		min-height: 1123px;
		background: #ffffff;
		color: #172554;
		border-radius: 4px;
		box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.6);
		padding: 56px 56px 40px;
		display: flex;
		flex-direction: column;
		gap: 28px;
		position: relative;
		font-family: 'Sora', system-ui, sans-serif;
		overflow: hidden;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.mono {
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
	}
	.small {
		font-size: 11px;
		line-height: 17px;
		color: #475569;
	}
	.ink2 {
		color: #334155;
		font-size: 12px;
		line-height: 18px;
	}
	.faint {
		color: #64748b;
	}
	.strong {
		font-weight: 600;
	}
	.r {
		text-align: right;
	}
	.head {
		display: flex;
		justify-content: space-between;
		gap: 24px;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.issuer {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.logo {
		height: 30px;
		align-self: flex-start;
	}
	.title {
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: flex-end;
		text-align: right;
	}
	.word {
		font-size: 30px;
		font-weight: 700;
		letter-spacing: 0.08em;
	}
	.no {
		font-size: 13px;
		font-weight: 600;
	}
	.parties {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
		gap: 24px;
		padding: 18px 0;
		border-top: 2px solid #172554;
		border-bottom: 1px solid #cbd5e1;
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.kicker {
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.14em;
		color: #64748b;
		text-transform: uppercase;
	}
	.party {
		font-size: 15px;
		font-weight: 700;
	}
	.facts {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 14px;
		font-size: 12px;
		align-content: start;
		margin: 0;
	}
	.facts dt {
		color: #64748b;
	}
	.facts dd {
		margin: 0;
		font-weight: 600;
		text-align: right;
	}
	.row {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr) 120px 110px 120px;
		gap: 10px;
	}
	.th {
		padding: 8px 0;
		border-bottom: 1px solid #172554;
		font-size: 10px;
		letter-spacing: 0.1em;
		color: #64748b;
		text-transform: uppercase;
	}
	.td {
		padding: 12px 0;
		border-bottom: 1px solid #e2e8f0;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	.sums {
		display: flex;
		justify-content: space-between;
		gap: 24px;
		flex-wrap: wrap;
	}
	.words {
		flex: 1 1 260px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 12px;
		line-height: 18px;
		color: #334155;
	}
	.terbilang {
		font-style: italic;
		font-weight: 600;
		color: #172554;
	}
	.stamp {
		align-self: flex-start;
		margin-top: 18px;
		margin-left: 8px;
		transform: rotate(-8deg);
		border: 3px solid var(--stamp);
		color: var(--stamp);
		border-radius: 8px;
		padding: 6px 16px;
		font-size: 20px;
		font-weight: 700;
		letter-spacing: 0.14em;
	}
	.totals {
		flex: 0 1 280px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 13px;
	}
	.line {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		color: #475569;
	}
	.line span:last-child {
		color: #172554;
		font-variant-numeric: tabular-nums;
	}
	.grand {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		margin-top: 4px;
		background: #172554;
		color: #fff;
		border-radius: 6px;
		align-items: baseline;
		font-weight: 700;
	}
	.grand span:last-child {
		font-size: 18px;
		font-variant-numeric: tabular-nums;
	}
	.howto {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 24px;
		padding: 16px;
		background: #f1f4f9;
		border-radius: 8px;
		font-size: 12px;
		line-height: 19px;
	}
	.grow {
		flex: 1;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 24px;
		flex-wrap: wrap;
	}
	.legal {
		font-size: 10px;
		line-height: 16px;
		color: #64748b;
		max-width: 380px;
	}
	.sign {
		display: flex;
		flex-direction: column;
		gap: 44px;
		align-items: center;
		font-size: 12px;
	}
	.signer {
		display: flex;
		flex-direction: column;
		align-items: center;
		border-top: 1px solid #172554;
		padding-top: 4px;
		min-width: 180px;
	}
	@media (max-width: 640px) {
		.paper {
			padding: 28px 20px;
			min-height: 0;
		}
		.parties,
		.howto {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media print {
		.paper {
			box-shadow: none;
			border-radius: 0;
			max-width: none;
			width: 100%;
			min-height: 0;
			height: 271mm;
			padding: 0;
		}
	}
</style>
