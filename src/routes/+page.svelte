<!-- 
    Reece Williams | march 2023 | Juno Modules
-->
<script lang="ts">
	import type { Window as KeplrWindow } from '@keplr-wallet/types';
	import type { OfflineSigner } from '@cosmjs/proto-signing';

	import {juno, cosmwasm, osmosis, router, getSigningJunoClient, getSigningOsmosisClient} from 'juno-network'		

	// Signing (Keplr & Ledger)
	import type { OfflineAminoSigner } from '@cosmjs/amino';
	import type { OfflineDirectSigner } from '@cosmjs/proto-signing';

	

	import toast, { Toaster, type ToastOptions } from 'svelte-french-toast';    	
	const toast_style: ToastOptions = {
		position: 'top-right',
		duration: 6000,
		style: 'background: #333; color: #fff; width: 15%; font-size: 1.1rem;'
	};

	// import success_notification from '../components/Status.svelte'
	// import {error_notification, success_notification} from '../components/Status.svelte'
	// import { SvelteToast } from '@zerodevx/svelte-toast';

	import '../components/FeeShare.svelte';
	import '../components/TokenFactory.svelte';
	import FeeShare from '../components/FeeShare.svelte';
	import TokenFactory from '../components/TokenFactory.svelte';

	const fee = {amount: [{	amount: "100000",	denom: "ujuno",},], gas: "200000",};
	
	const CHAIN_ID = "juno-1"
	const rpcEndpoint = "https://rpc.juno.strange.love/"			

	const contract_addr_len = 63
	const juno_addr_len = 43

	// user variables	
	let contract_addr = "" //juno1d7yjapmwerm6qxaxtuyefmcns45x9x6d78gys9uhfsdpkfs4dxfssgw7ap
	let method = "register" // and update
	let controlling_contract_account = ""
	let contract_label = ""	

	let new_address = ""	
</script>

<Toaster />

<center>		
	<a href="https://github.com/Reecepbcups/juno-chain-webapp">https://github.com/Reecepbcups/juno-chain-webapp</a>
	<hr>
	<br>

	<FeeShare rpcEndpoint={rpcEndpoint} fee={fee} />
	<br>
	<hr>

	<TokenFactory rpcEndpoint={rpcEndpoint} fee={fee} />
			
	<br>
	<br>
	<br>
	<br>
	<br>
	<hr>
	<div class="footer">
		<ul id="mintscan_links" style="list-style-type: none">			
		</ul>
	</div>

</center>


<style>		
	/* make all font 1.2em */
	* {
		font-size: 1.1em;
	}
</style>
