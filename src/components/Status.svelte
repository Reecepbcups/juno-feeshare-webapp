<script lang="ts" context="module">
    import { toast, SvelteToast } from '@zerodevx/svelte-toast'			
	import type {SvelteToastOptions} from '@zerodevx/svelte-toast/stores'

    const toast_default_style: SvelteToastOptions = {
		initial: 0,
		duration: 6000,
		dismissable: true,		
	};

	const error_fmt: SvelteToastOptions = {
		theme: {
			'--toastBackground': 'red',
			'--toastColor': 'black',			
		},		
		...toast_default_style
	}
	const success_fmt: SvelteToastOptions = {
		theme: {
			'--toastBackground': 'green',
			'--toastColor': 'black',			
		},		
		...toast_default_style
	}    

    export function success_notification(message: string) {
        toast.push(message, success_fmt);
    }

    export function error_notification(message: string) {
        toast.push(message, error_fmt);
    }    

</script>

<style>
	
</style>