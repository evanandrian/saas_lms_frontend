<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Calendar from '@lucide/svelte/icons/calendar';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Clock from '@lucide/svelte/icons/clock';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import FileText from '@lucide/svelte/icons/file-text';
	import Flame from '@lucide/svelte/icons/flame';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import Send from '@lucide/svelte/icons/send';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import UserCheck from '@lucide/svelte/icons/user-check';
	import X from '@lucide/svelte/icons/x';
	import type { PageProps } from './$types';
	import type { AttendanceStatus, MonthlyAttendanceSummary } from './attendance.types';

	let { data }: PageProps = $props();
	const i18n = useI18n();

	const STATUS_CONFIG: Record<AttendanceStatus, { label: string; badge: string; icon: typeof CheckCircle2 }> = {
		present: { label: 'Hadir', badge: 'bg-success-400/15 text-success-500 border-success-400/30', icon: CheckCircle2 },
		late: { label: 'Terlambat', badge: 'bg-warning-500/15 text-warning-500 border-warning-500/30', icon: Clock },
		permit: { label: 'Izin', badge: 'bg-lms-interactive-subtle text-lms-interactive border-lms-interactive/30', icon: FileText },
		sick: { label: 'Sakit', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: AlertCircle },
		absent: { label: 'Tanpa Keterangan', badge: 'bg-error-500/15 text-error-400 border-error-500/30', icon: X }
	};

	let selectedMonthIndex = $state<number>(0);
	let isPermitModalOpen = $state<boolean>(false);
	let permitType = $state<'permit' | 'sick'>('permit');
	let permitStartDate = $state<string>('');
	let permitEndDate = $state<string>('');
	let permitReason = $state<string>('');
	let permitFileName = $state<string>('');
	let permitSuccessMsg = $state<string | null>(null);

	const defaultMonth: MonthlyAttendanceSummary = {
		month: 9,
		year: 2026,
		monthLabel: 'September 2026',
		totalSchoolDays: 22,
		presentDays: 20,
		lateDays: 1,
		permitDays: 1,
		sickDays: 0,
		absentDays: 0,
		attendanceRate: 95.5,
		dailyRecords: []
	};

	const months = $derived(data.attendanceData.months);
	const currentMonth = $derived(months[selectedMonthIndex] ?? months[0] ?? defaultMonth);
	const permitRequests = $derived(data.attendanceData.permitRequests);

	function openPermitModal() {
		permitSuccessMsg = null;
		permitReason = '';
		permitFileName = '';
		permitStartDate = new Date().toISOString().slice(0, 10);
		permitEndDate = new Date().toISOString().slice(0, 10);
		isPermitModalOpen = true;
	}

	function closePermitModal() {
		isPermitModalOpen = false;
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			permitFileName = target.files[0].name;
		}
	}

	function submitPermit() {
		permitSuccessMsg = 'Surat permohonan izin berhasil diajukan ke wali kelas & piket sekolah!';
		setTimeout(() => {
			closePermitModal();
		}, 1500);
	}
</script>

<svelte:head>
	<title>Presensi & Kehadiran · {data.attendanceData.studentName}</title>
</svelte:head>

<div class="flex min-w-0 flex-col gap-6 leading-tight">
	<!-- Hero Section -->
	<section
		class="bg-lms-hero text-lms-on-hero relative isolate flex min-w-0 flex-col gap-5 overflow-hidden rounded-[22px] p-7 md:p-8"
	>
		<img
			src={logogramColor}
			alt=""
			aria-hidden="true"
			draggable="false"
			class="pointer-events-none absolute -top-8 -right-10 -z-10 w-72 max-w-none opacity-10 select-none"
		/>
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div class="flex flex-col items-start gap-2">
				<span
					class="bg-warning-400 text-lms-brand-deep-neutral rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.14em]"
				>
					PRESENSI & KEHADIRAN
				</span>
				<h1 class="text-[1.75rem] md:text-3xl font-bold">Rekap Presensi Siswa</h1>
				<p class="text-lms-on-hero-muted text-sm md:text-base max-w-xl">
					{data.attendanceData.studentName} · Kelas {data.attendanceData.className} · Tingkat Kehadiran Semester: <strong>{data.attendanceData.semesterAttendanceRate}%</strong>
				</p>
			</div>

			<!-- Action Button -->
			<button
				type="button"
				class="bg-lms-on-hero text-lms-brand-deep-neutral hover:opacity-90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all self-start md:self-auto"
				onclick={openPermitModal}
			>
				<Icon icon={FilePlus} size="sm" />
				Ajukan Izin / Sakit
			</button>
		</div>

		<!-- Quick Stats -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 max-w-2xl">
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Persentase Hadir</span>
				<span class="text-2xl font-bold text-success-400">{data.attendanceData.semesterAttendanceRate}%</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Streak Belajar</span>
				<span class="text-2xl font-bold text-warning-400 flex items-center gap-1">
					<Icon icon={Flame} size="sm" /> {data.attendanceData.currentStreakDays} Hari
				</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Terlambat</span>
				<span class="text-2xl font-bold text-warning-500">1 Kali</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Izin / Sakit</span>
				<span class="text-2xl font-bold text-lms-link">3 Hari</span>
			</div>
		</div>
	</section>

	<!-- Month Filter Selector -->
	<div class="lms-card flex items-center justify-between gap-4 rounded-[22px]! p-4 shadow-none!">
		<div class="flex items-center gap-2 overflow-x-auto scrollbar-none">
			{#each months as m, idx (m.monthLabel)}
				<button
					type="button"
					class={[
						'lms-focus-ring flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors',
						selectedMonthIndex === idx
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedMonthIndex = idx)}
				>
					<Icon icon={Calendar} size="sm" />
					{m.monthLabel}
				</button>
			{/each}
		</div>

		<div class="hidden sm:flex items-center gap-3 text-xs font-semibold">
			<span class="text-lms-muted">Tingkat Kehadiran Bulan Ini:</span>
			<span class="text-success-400 font-bold text-sm tabular-nums">{currentMonth.attendanceRate}%</span>
		</div>
	</div>

	<!-- Monthly Summary Counters Card -->
	<div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
		<div class="lms-card rounded-2xl! p-4 flex flex-col gap-1 shadow-none! border border-success-400/20 bg-success-400/5">
			<span class="text-xs font-semibold text-success-500">Hadir Tepat Waktu</span>
			<span class="text-2xl font-bold tabular-nums text-success-500">{currentMonth.presentDays} <span class="text-xs font-normal">Hari</span></span>
		</div>
		<div class="lms-card rounded-2xl! p-4 flex flex-col gap-1 shadow-none! border border-warning-500/20 bg-warning-500/5">
			<span class="text-xs font-semibold text-warning-500">Terlambat</span>
			<span class="text-2xl font-bold tabular-nums text-warning-500">{currentMonth.lateDays} <span class="text-xs font-normal">Hari</span></span>
		</div>
		<div class="lms-card rounded-2xl! p-4 flex flex-col gap-1 shadow-none! border border-lms-interactive/20 bg-lms-interactive-subtle">
			<span class="text-xs font-semibold text-lms-interactive">Izin Resmi</span>
			<span class="text-2xl font-bold tabular-nums text-lms-interactive">{currentMonth.permitDays} <span class="text-xs font-normal">Hari</span></span>
		</div>
		<div class="lms-card rounded-2xl! p-4 flex flex-col gap-1 shadow-none! border border-purple-500/20 bg-purple-500/5">
			<span class="text-xs font-semibold text-purple-400">Sakit</span>
			<span class="text-2xl font-bold tabular-nums text-purple-400">{currentMonth.sickDays} <span class="text-xs font-normal">Hari</span></span>
		</div>
		<div class="lms-card rounded-2xl! p-4 flex flex-col gap-1 shadow-none! border border-error-500/20 bg-error-500/5 col-span-2 sm:col-span-1">
			<span class="text-xs font-semibold text-error-400">Alpa / Tanpa Surat</span>
			<span class="text-2xl font-bold tabular-nums text-error-400">{currentMonth.absentDays} <span class="text-xs font-normal">Hari</span></span>
		</div>
	</div>

	<!-- Daily Attendance Log Table -->
	<div class="lms-card flex flex-col gap-4 rounded-[22px]! p-5 shadow-none!">
		<div class="flex items-center justify-between">
			<h3 class="text-base font-bold flex items-center gap-2">
				<Icon icon={CalendarCheck} size="md" />
				Log Presensi Harian ({currentMonth.monthLabel})
			</h3>
			<span class="text-xs text-lms-muted font-medium">Total {currentMonth.totalSchoolDays} Hari Sekolah</span>
		</div>

		{#if currentMonth.dailyRecords.length === 0}
			<div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
				<Icon icon={Clock} size="lg" />
				<p class="text-sm font-semibold">Belum ada rincian catatan harian untuk bulan ini</p>
				<p class="text-xs text-lms-muted">Semua kehadiran tercatat otomatis saat tap kartu RFID / aplikasi presensi.</p>
			</div>
		{:else}
			<div class="overflow-x-auto border border-lms-border rounded-xl">
				<table class="w-full text-left border-collapse text-xs">
					<thead>
						<tr class="border-b border-lms-border bg-lms-surface-muted text-[11px] text-lms-muted uppercase tracking-wider">
							<th class="p-3">Tanggal & Hari</th>
							<th class="p-3 text-center">Jam Masuk</th>
							<th class="p-3 text-center">Jam Pulang</th>
							<th class="p-3 text-center">Status Kehadiran</th>
							<th class="p-3">Catatan / Keterangan</th>
						</tr>
					</thead>
					<tbody>
						{#each currentMonth.dailyRecords as row (row.date)}
							{@const cfg = STATUS_CONFIG[row.status]}
							<tr class="border-b border-lms-border/50 hover:bg-lms-surface-muted/30 transition-colors">
								<td class="p-3 font-semibold">
									{row.dayName}, {row.date}
								</td>
								<td class="p-3 text-center font-mono font-medium">{row.checkInTime}</td>
								<td class="p-3 text-center font-mono font-medium">{row.checkOutTime}</td>
								<td class="p-3 text-center">
									<span class={['inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold', cfg.badge]}>
										<Icon icon={cfg.icon} size="sm" />
										{cfg.label}
									</span>
								</td>
								<td class="p-3 text-lms-muted text-[11px]">
									{row.note ?? '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- History of Permit Requests -->
	<div class="lms-card flex flex-col gap-4 rounded-[22px]! p-5 shadow-none!">
		<h3 class="text-base font-bold flex items-center gap-2">
			<Icon icon={FileText} size="md" />
			Riwayat Pengajuan Izin & Surat Keterangan Sakit
		</h3>

		<div class="grid gap-3 md:grid-cols-2">
			{#each permitRequests as req (req.id)}
				<div class="border border-lms-border rounded-2xl p-4 flex flex-col justify-between gap-3 bg-lms-surface">
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<span class="bg-lms-interactive-subtle text-lms-interactive font-bold text-xs rounded-lg px-2.5 py-1">
								{req.type === 'permit' ? 'Surat Izin' : 'Surat Sakit'}
							</span>
							<span class="bg-success-400/10 text-success-500 border border-success-400/30 rounded-md px-2 py-0.5 text-[11px] font-bold">
								Disetujui
							</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-xs font-bold text-lms-foreground">
								Rentang: {req.startDate} s.d. {req.endDate}
							</span>
							<p class="text-xs text-lms-muted leading-relaxed">
								"{req.reason}"
							</p>
						</div>
					</div>

					{#if req.fileName}
						<div class="border-t border-lms-border pt-2 text-[11px] text-lms-muted flex items-center gap-1.5">
							<Icon icon={Paperclip} size="sm" /> Lampiran: <strong>{req.fileName}</strong>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Modal Form Pengajuan Izin / Sakit -->
{#if isPermitModalOpen}
	<div
		class="bg-lms-scrim/60 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="permit-modal-title"
	>
		<div
			class="bg-lms-surface border-lms-border flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border shadow-2xl"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-lms-border p-5">
				<div class="flex items-center gap-3">
					<span class="bg-lms-interactive-subtle text-lms-interactive flex size-10 items-center justify-center rounded-xl">
						<Icon icon={FilePlus} size="md" />
					</span>
					<div class="flex flex-col">
						<h2 id="permit-modal-title" class="text-base font-bold">
							Form Permohonan Izin / Sakit
						</h2>
						<span class="text-lms-muted text-[11px]">
							Diserahkan kepada Wali Kelas {data.attendanceData.className} & Guru Piket
						</span>
					</div>
				</div>
				<button
					type="button"
					class="text-lms-muted hover:text-lms-foreground flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-lms-surface-muted"
					onclick={closePermitModal}
					aria-label="Tutup"
				>
					<Icon icon={X} size="md" />
				</button>
			</div>

			<!-- Modal Body -->
			<div class="flex flex-col gap-4 overflow-y-auto p-6 leading-relaxed text-xs">
				{#if permitSuccessMsg}
					<div class="bg-success-400/10 border border-success-400 text-success-500 rounded-xl p-4 flex items-center gap-3 text-sm font-bold">
						<Icon icon={CheckCircle2} size="md" />
						{permitSuccessMsg}
					</div>
				{/if}

				<!-- Jenis Izin Tabs -->
				<div class="flex flex-col gap-1.5">
					<span class="font-bold text-lms-foreground">Jenis Permohonan</span>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							class={[
								'h-10 rounded-xl font-bold border transition-colors',
								permitType === 'permit'
									? 'bg-lms-interactive text-lms-on-interactive border-lms-interactive'
									: 'bg-lms-surface border-lms-border text-lms-muted'
							]}
							onclick={() => (permitType = 'permit')}
						>
							Izin Keperluan / Dinas
						</button>
						<button
							type="button"
							class={[
								'h-10 rounded-xl font-bold border transition-colors',
								permitType === 'sick'
									? 'bg-lms-interactive text-lms-on-interactive border-lms-interactive'
									: 'bg-lms-surface border-lms-border text-lms-muted'
							]}
							onclick={() => (permitType = 'sick')}
						>
							Sakit (Surat Dokter)
						</button>
					</div>
				</div>

				<!-- Tanggal -->
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-1">
						<label for="start-date" class="font-bold text-lms-foreground">Tanggal Mulai</label>
						<input
							id="start-date"
							type="date"
							bind:value={permitStartDate}
							class="lms-input bg-lms-surface border-lms-border h-10 rounded-xl px-3 text-xs"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="end-date" class="font-bold text-lms-foreground">Tanggal Selesai</label>
						<input
							id="end-date"
							type="date"
							bind:value={permitEndDate}
							class="lms-input bg-lms-surface border-lms-border h-10 rounded-xl px-3 text-xs"
						/>
					</div>
				</div>

				<!-- Keterangan Alasan -->
				<div class="flex flex-col gap-1.5">
					<label for="permit-reason" class="font-bold text-lms-foreground">Alasan / Keterangan</label>
					<textarea
						id="permit-reason"
						bind:value={permitReason}
						rows="3"
						placeholder="Tuliskan keterangan lengkap alasan izin atau gejala sakit..."
						class="lms-input bg-lms-surface border-lms-border w-full rounded-xl p-3 text-xs leading-relaxed"
					></textarea>
				</div>

				<!-- Upload Lampiran -->
				<div class="flex flex-col gap-1.5">
					<span class="font-bold text-lms-foreground">Unggah Surat Keterangan / Bukti (PDF / Foto)</span>
					<label
						class="border-lms-border hover:border-lms-interactive bg-lms-surface hover:bg-lms-interactive-subtle/40 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 cursor-pointer transition-all text-center"
					>
						<Icon icon={UploadCloud} size="md" />
						<span class="font-bold">
							{permitFileName ? permitFileName : 'Pilih file surat keterangan dokter / surat tugas'}
						</span>
						<span class="text-lms-muted text-[11px]">Format PDF, JPG, PNG (Maks. 10MB)</span>
						<input
							type="file"
							class="sr-only"
							accept=".pdf,.jpg,.jpeg,.png"
							onchange={handleFileSelect}
						/>
					</label>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-end gap-2 border-t border-lms-border p-4 bg-lms-surface-muted/30">
				<button
					type="button"
					class="lms-action-ghost rounded-xl px-4 py-2 text-xs font-semibold"
					onclick={closePermitModal}
				>
					Tutup
				</button>
				<button
					type="button"
					class="lms-action-primary flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold"
					onclick={submitPermit}
				>
					<Icon icon={Send} size="sm" />
					Kirim Permohonan
				</button>
			</div>
		</div>
	</div>
{/if}
