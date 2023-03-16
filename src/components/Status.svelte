<script lang="ts" context="module">
    // import { toast, SvelteToast } from '@zerodevx/svelte-toast'			
	// import type {SvelteToastOptions} from '@zerodevx/svelte-toast/stores'

	import toast, { Toaster, type ToastOptions } from 'svelte-french-toast';    	
	const toast_style: ToastOptions = {
		position: 'top-right',
		duration: 6000,
		style: 'background: #333; color: #fff; width: 20%; font-size: 1.0rem; border-radius: 10px;',		
	};

    export function success_notification(message: string) {
        toast.success(message, toast_style);
    }

    export function error_notification(message: string) {
		toast.error(message, toast_style);
    }    

</script>

<style>
	
</style>