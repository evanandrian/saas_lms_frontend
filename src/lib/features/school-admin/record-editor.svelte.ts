import { invalidate } from '$app/navigation';
import { runPageAction } from '$lib/utils/page-action';
import { PROGRESS_DEPENDENCY_KEY, failureMessage, fieldErrors } from './school-admin.model';

type T = (key: string, params?: Readonly<Record<string, string | number>>) => string;

const TOAST_MS = 5000;

/**
 * State halaman list + drawer (referensi v4): buka/tutup drawer, simpan/hapus lewat form action
 * (`save`/`remove` → tampilan terbaru), pesan error per field, dan toast. Setelah perubahan data,
 * status 12 bagian di layout disegarkan agar banner celah data ikut berubah.
 */
export function createRecordEditor<V>(t: T, apply: (view: V) => void) {
	let open = $state(false);
	let editId = $state<string | null>(null);
	let errors = $state<Record<string, string>>({});
	let busy = $state(false);
	let toast = $state<string | null>(null);
	let lastCode = $state('');
	let toastError = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Dipanggil saat inisialisasi komponen: bersihkan timer toast ketika halaman dilepas.
	$effect(() => () => clearTimeout(timer));

	function notify(message: string, error = false) {
		toast = message;
		toastError = error;
		clearTimeout(timer);
		timer = setTimeout(() => (toast = null), TOAST_MS);
	}

	async function run<R>(name: string, body: unknown): Promise<R | null> {
		busy = true;
		const out = await runPageAction<R>(name, body);
		busy = false;
		lastCode = out.ok ? '' : out.code;
		if (!out.ok) {
			errors = fieldErrors(t, out);
			notify(failureMessage(t, out), true);
			return null;
		}
		return out.data;
	}

	return {
		get open() {
			return open;
		},
		get editId() {
			return editId;
		},
		get errors() {
			return errors;
		},
		get busy() {
			return busy;
		},
		get toast() {
			return toast;
		},
		/** Toast terakhir berasal dari kegagalan (ikon peringatan). */
		get toastError() {
			return toastError;
		},
		/** Kode error backend terakhir (mis. `quota_students_exceeded`). */
		get lastCode() {
			return lastCode;
		},
		get hasErrors() {
			return Object.keys(errors).length > 0;
		},
		notify,
		run,
		show(id: string | null) {
			editId = id;
			errors = {};
			open = true;
		},
		close() {
			open = false;
		},
		clearError(field: string) {
			if (!errors[field]) return;
			const next = { ...errors };
			delete next[field];
			errors = next;
		},
		setErrors(next: Record<string, string>) {
			errors = next;
		},
		/** Simpan: action `save` menerima `{id, data}` dan mengembalikan tampilan list terbaru. */
		async save(data: unknown, messages: { added: string; saved: string }) {
			const wasEdit = Boolean(editId);
			const view = await run<V>('save', { id: editId ?? '', data });
			if (!view) return false;
			apply(view);
			open = false;
			notify(wasEdit ? messages.saved : messages.added);
			void invalidate(PROGRESS_DEPENDENCY_KEY);
			return true;
		},
		async remove(id: string, message: string) {
			const view = await run<V>('remove', { id });
			if (!view) return false;
			apply(view);
			open = false;
			notify(message);
			void invalidate(PROGRESS_DEPENDENCY_KEY);
			return true;
		}
	};
}

export type RecordEditor<V> = ReturnType<typeof createRecordEditor<V>>;
