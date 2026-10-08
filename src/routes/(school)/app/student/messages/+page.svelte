<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { useI18n } from '$lib/i18n';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import FileText from '@lucide/svelte/icons/file-text';
	import Info from '@lucide/svelte/icons/info';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import Phone from '@lucide/svelte/icons/phone';
	import Search from '@lucide/svelte/icons/search';
	import Send from '@lucide/svelte/icons/send';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Smile from '@lucide/svelte/icons/smile';
	import User from '@lucide/svelte/icons/user';
	import Video from '@lucide/svelte/icons/video';
	import X from '@lucide/svelte/icons/x';
	import type { PageProps } from './$types';
	import type { ConversationChannel } from './messages.types';

	let { data }: PageProps = $props();
	const i18n = useI18n();

	// svelte-ignore state_referenced_locally
	let selectedChannelId = $state<string>(data.messagesData.channels[0]?.id ?? 'ch-homeroom');
	let searchContactQuery = $state<string>('');
	let selectedTab = $state<'all' | 'teachers' | 'announcements'>('all');
	let draftMessage = $state<string>('');
	let chatContainer = $state<HTMLDivElement | null>(null);

	const channels = $derived(data.messagesData.channels);
	const defaultChannel: ConversationChannel = {
		id: 'default',
		name: 'Pesan Guru',
		roleLabel: 'Guru',
		avatarInitials: 'PG',
		unreadCount: 0,
		lastMessage: '',
		lastMessageTime: '',
		isOnline: false,
		messages: []
	};

	const activeChannel = $derived(
		channels.find((c) => c.id === selectedChannelId) ?? channels[0] ?? defaultChannel
	);

	const filteredChannels = $derived(
		channels.filter((c) => {
			if (selectedTab === 'teachers' && c.id === 'ch-announcement') return false;
			if (selectedTab === 'announcements' && c.id !== 'ch-announcement') return false;

			const query = searchContactQuery.toLowerCase().trim();
			return (
				!query ||
				c.name.toLowerCase().includes(query) ||
				c.roleLabel.toLowerCase().includes(query) ||
				c.lastMessage.toLowerCase().includes(query)
			);
		})
	);

	function sendMessage() {
		if (!draftMessage.trim()) return;
		const now = new Date();
		const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
		activeChannel.messages.push({
			id: `m-${Date.now()}`,
			sender: 'student',
			senderName: data.messagesData.studentName,
			text: draftMessage.trim(),
			timestamp: timeStr
		});
		activeChannel.lastMessage = draftMessage.trim();
		activeChannel.lastMessageTime = timeStr;
		draftMessage = '';

		// Auto scroll to bottom
		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 50);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
</script>

<svelte:head>
	<title>Pesan & Buku Penghubung · {data.messagesData.studentName}</title>
</svelte:head>

<div class="flex min-w-0 flex-col h-[calc(100vh-7.5rem)] min-h-[600px] gap-2.5 leading-tight">
	<!-- Compact Top Header Bar -->
	<div class="flex items-center justify-between shrink-0 px-1">
		<div class="flex items-center gap-2.5">
			<span class="bg-lms-interactive-subtle text-lms-interactive flex size-8.5 items-center justify-center rounded-xl">
				<Icon icon={MessageSquare} size="md" />
			</span>
			<div class="flex flex-col">
				<h1 class="text-base font-bold text-lms-foreground">Pesan & Buku Penghubung</h1>
				<span class="text-lms-muted text-[11px]">
					Konsultasi belajar kelas {data.messagesData.className} dengan wali kelas & guru mata pelajaran
				</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<span class="bg-lms-surface border border-lms-border text-lms-muted text-[11px] font-semibold px-3 py-1 rounded-full">
				Tahun Ajaran 2026/2027
			</span>
		</div>
	</div>

	<!-- WhatsApp Web Desktop Messenger Full Height -->
	<div
		class="lms-card flex flex-row flex-1 h-full min-h-0 overflow-hidden rounded-[24px]! p-0 shadow-xl! border border-lms-border bg-lms-surface"
	>
		<!-- ======================================================= -->
		<!-- PANEL KIRI (SIDEBAR): DAFTAR KONTAK GURU (WHATSAPP STYLE) -->
		<!-- ======================================================= -->
		<aside class="w-80 lg:w-96 shrink-0 flex flex-col h-full min-h-0 border-r border-lms-border bg-lms-surface overflow-hidden">
			<!-- Header Kontak Kiri -->
			<div class="p-3 border-b border-lms-border flex flex-col gap-2 bg-lms-surface shrink-0">
				<div class="flex items-center justify-between">
					<h2 class="text-base font-bold text-lms-foreground flex items-center gap-2">
						<Icon icon={MessageSquare} size="md" />
						Daftar Guru & Saluran
					</h2>
					<span class="bg-lms-interactive-subtle text-lms-interactive text-[11px] font-bold px-2 py-0.5 rounded-full">
						{channels.length} Kontak
					</span>
				</div>

				<!-- Search Bar Guru -->
				<div class="relative flex items-center">
					<span class="text-lms-muted pointer-events-none absolute left-3">
						<Icon icon={Search} size="sm" />
					</span>
					<input
						type="text"
						bind:value={searchContactQuery}
						placeholder="Cari guru atau mata pelajaran..."
						class="lms-input bg-lms-surface-muted border-transparent focus:border-lms-interactive h-9.5 w-full rounded-xl pl-9 pr-3 text-xs"
					/>
					{#if searchContactQuery}
						<button
							type="button"
							class="text-lms-muted hover:text-lms-foreground absolute right-2.5 p-0.5"
							onclick={() => (searchContactQuery = '')}
							aria-label="Hapus pencarian"
						>
							<Icon icon={X} size="sm" />
						</button>
					{/if}
				</div>

				<!-- Quick Filter Tabs -->
				<div class="flex items-center gap-1">
					<button
						type="button"
						class={[
							'flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors text-center',
							selectedTab === 'all'
								? 'bg-lms-interactive text-lms-on-interactive'
								: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
						]}
						onclick={() => (selectedTab = 'all')}
					>
						Semua
					</button>
					<button
						type="button"
						class={[
							'flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors text-center',
							selectedTab === 'teachers'
								? 'bg-lms-interactive text-lms-on-interactive'
								: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
						]}
						onclick={() => (selectedTab = 'teachers')}
					>
						Guru
					</button>
					<button
						type="button"
						class={[
							'flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors text-center',
							selectedTab === 'announcements'
								? 'bg-lms-interactive text-lms-on-interactive'
								: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
						]}
						onclick={() => (selectedTab = 'announcements')}
					>
						Pengumuman
					</button>
				</div>
			</div>

			<!-- List Kontak Guru (Scrollable) -->
			<div class="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-lms-border/30">
				{#if filteredChannels.length === 0}
					<div class="flex flex-col items-center justify-center p-8 text-center text-lms-muted gap-2">
						<Icon icon={Search} size="lg" />
						<p class="text-xs">Guru tidak ditemukan</p>
					</div>
				{:else}
					{#each filteredChannels as ch (ch.id)}
						{@const isSelected = selectedChannelId === ch.id}
						<button
							type="button"
							class={[
								'lms-focus-ring flex items-center gap-3 rounded-2xl p-3 text-left transition-all w-full',
								isSelected
									? 'bg-lms-interactive-subtle border-lms-interactive/40 shadow-xs border'
									: 'hover:bg-lms-surface-muted border border-transparent'
							]}
							onclick={() => {
								selectedChannelId = ch.id;
								ch.unreadCount = 0;
							}}
						>
							<div class="relative flex-none">
								<Avatar initials={ch.avatarInitials} size="md" tone={isSelected ? 'brand' : 'subtle'} />
								{#if ch.isOnline}
									<span class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success-400 border-2 border-lms-surface ring-1 ring-success-500/50"></span>
								{/if}
							</div>

							<div class="flex min-w-0 flex-1 flex-col gap-0.5">
								<div class="flex items-center justify-between gap-1">
									<span class={['text-xs font-bold truncate', isSelected ? 'text-lms-interactive' : 'text-lms-foreground']}>
										{ch.name}
									</span>
									<span class="text-[10px] text-lms-muted flex-none">{ch.lastMessageTime}</span>
								</div>
								<span class="text-[11px] text-lms-muted font-medium truncate">{ch.roleLabel}</span>
								<p class="text-[11px] text-lms-muted truncate mt-0.5 max-w-[200px]">
									{ch.lastMessage}
								</p>
							</div>

							{#if ch.unreadCount > 0}
								<span class="bg-lms-interactive text-lms-on-interactive flex size-5 flex-none items-center justify-center rounded-full text-[10px] font-bold shadow-xs">
									{ch.unreadCount}
								</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</aside>

		<!-- ========================================== -->
		<!-- PANEL KANAN: RUANG CHAT / MESSENGER ACTIVE -->
		<!-- ========================================== -->
		<main class="flex-1 min-w-0 flex flex-col h-full bg-lms-surface-muted/15 relative overflow-hidden">
			<!-- Header Chat Kanan -->
			<header class="flex items-center justify-between border-b border-lms-border bg-lms-surface px-5 py-3.5 shadow-xs z-10">
				<div class="flex items-center gap-3.5">
					<div class="relative">
						<Avatar initials={activeChannel.avatarInitials} size="md" tone="brand" />
						{#if activeChannel.isOnline}
							<span class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success-400 border-2 border-lms-surface"></span>
						{/if}
					</div>
					<div class="flex flex-col">
						<h3 class="text-sm font-bold text-lms-foreground flex items-center gap-2">
							{activeChannel.name}
						</h3>
						<span class="text-lms-muted text-[11px] flex items-center gap-1.5">
							<span class="font-semibold text-lms-interactive">{activeChannel.roleLabel}</span>
							<span>·</span>
							<span class={activeChannel.isOnline ? 'text-success-500 font-medium' : 'text-lms-muted'}>
								{activeChannel.isOnline ? '● Online' : 'Offline'}
							</span>
						</span>
					</div>
				</div>

				<!-- Quick Header Actions -->
				<div class="flex items-center gap-1 text-lms-muted">
					<button
						type="button"
						class="hover:text-lms-foreground hover:bg-lms-surface-muted flex size-9 items-center justify-center rounded-xl transition-colors"
						title="Konsultasi Audio"
						aria-label="Konsultasi Audio"
					>
						<Icon icon={Phone} size="sm" />
					</button>
					<button
						type="button"
						class="hover:text-lms-foreground hover:bg-lms-surface-muted flex size-9 items-center justify-center rounded-xl transition-colors"
						title="Video Meeting Guru"
						aria-label="Video Meeting Guru"
					>
						<Icon icon={Video} size="sm" />
					</button>
					<button
						type="button"
						class="hover:text-lms-foreground hover:bg-lms-surface-muted flex size-9 items-center justify-center rounded-xl transition-colors"
						title="Informasi Kontak"
						aria-label="Informasi Kontak"
					>
						<Icon icon={Info} size="sm" />
					</button>
				</div>
			</header>

			<!-- Canvas Messages Bubble Container -->
			<div
				bind:this={chatContainer}
				class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 flex flex-col justify-start"
			>
				<!-- Date Separator Badge -->
				<div class="flex justify-center my-2">
					<span class="bg-lms-surface border border-lms-border text-lms-muted text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
						Hari ini
					</span>
				</div>

				{#each activeChannel.messages as msg (msg.id)}
					{@const isMe = msg.sender === 'student'}
					{@const isSystem = msg.sender === 'system'}

					{#if isSystem}
						<!-- System Broadcast Announcement Bubble -->
						<div class="flex justify-center my-3">
							<div class="bg-warning-400/10 border border-warning-400/30 text-warning-500 rounded-2xl p-4 text-xs max-w-lg text-center shadow-xs">
								<div class="flex items-center justify-center gap-1.5 font-bold mb-1">
									<Icon icon={ShieldAlert} size="sm" />
									{msg.senderName}
								</div>
								<p class="text-xs text-lms-foreground leading-relaxed">{msg.text}</p>
								<span class="text-[10px] text-lms-muted block mt-2">{msg.timestamp} WIB</span>
							</div>
						</div>
					{:else}
						<!-- Chat Bubble Item -->
						<div class={['flex items-end gap-2.5 w-full', isMe ? 'justify-end' : 'justify-start']}>
							{#if !isMe}
								<Avatar initials={activeChannel.avatarInitials} size="sm" tone="subtle" />
							{/if}

							<div
								class={[
									'flex flex-col gap-1 max-w-[82%] sm:max-w-md rounded-2xl p-3.5 text-xs shadow-sm transition-all',
									isMe
										? 'bg-lms-interactive text-lms-on-interactive rounded-br-xs'
										: 'bg-lms-surface border border-lms-border text-lms-foreground rounded-bl-xs'
								]}
							>
								{#if !isMe}
									<span class="text-[10px] font-bold text-lms-interactive">{msg.senderName}</span>
								{/if}

								<p class="leading-relaxed whitespace-pre-wrap text-[13px]">{msg.text}</p>

								{#if msg.attachmentName}
									<div class="bg-lms-surface-muted/50 border border-lms-border rounded-xl p-2.5 flex items-center gap-2 mt-1">
										<Icon icon={FileText} size="sm" />
										<span class="font-bold truncate">{msg.attachmentName}</span>
									</div>
								{/if}

								<div class={['flex items-center gap-1 text-[10px] mt-1', isMe ? 'text-lms-on-interactive/70 justify-end' : 'text-lms-muted justify-end']}>
									<span>{msg.timestamp}</span>
									{#if isMe}
										<Icon icon={CheckCheck} size="sm" />
									{/if}
								</div>
							</div>
						</div>
					{/if}
				{/each}
			</div>

			<!-- Input Bar Bawah (Desktop Style) -->
			<footer class="border-t border-lms-border bg-lms-surface p-3.5 sm:p-4 z-10">
				<form
					class="flex items-center gap-2.5 bg-lms-surface-muted/50 border border-lms-border focus-within:border-lms-interactive rounded-2xl p-1.5 pl-3 transition-colors"
					onsubmit={(e) => {
						e.preventDefault();
						sendMessage();
					}}
				>
					<button
						type="button"
						class="text-lms-muted hover:text-lms-foreground flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-lms-surface-muted"
						title="Lampirkan Dokumen"
						aria-label="Lampirkan Dokumen"
					>
						<Icon icon={Paperclip} size="sm" />
					</button>

					<input
						type="text"
						bind:value={draftMessage}
						onkeydown={handleKeyDown}
						placeholder="Ketik pesan kepada {activeChannel.name}..."
						class="bg-transparent focus:outline-none h-10 flex-1 text-xs text-lms-foreground placeholder:text-lms-muted"
					/>

					<button
						type="submit"
						class="lms-action-primary flex size-10 items-center justify-center rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
						disabled={!draftMessage.trim()}
						aria-label="Kirim Pesan"
					>
						<Icon icon={Send} size="sm" />
					</button>
				</form>
			</footer>
		</main>
	</div>
</div>
