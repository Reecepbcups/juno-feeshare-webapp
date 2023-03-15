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

	

	// import toast, { Toaster, type ToastOptions } from 'svelte-french-toast';    	
	// const toast_style: ToastOptions = {
	// 	position: 'top-right',
	// 	duration: 6000,
	// 	style: 'background: #333; color: #fff; width: 15%; font-size: 1.1rem;'
	// };

	// import success_notification from '../components/Status.svelte'
	import {error_notification, success_notification} from '../components/Status.svelte'
	import { SvelteToast } from '@zerodevx/svelte-toast';

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

	const query_tokenfactory_tokens = async () => {
		let address = "juno10r39fueph9fq7a6lgswu4zdsg8t3gxlq670lt0"
		let osmo_query = (await osmosis.ClientFactory.createRPCQueryClient({rpcEndpoint}));

		let res = await osmo_query.osmosis.tokenfactory.v1beta1.denomsFromCreator({creator: address}).then(res => {
			return res
		}).catch(e => {
			return undefined
		})

		console.log(res)

		return res
	}

	

</script>

<!-- <Toaster /> -->
<SvelteToast />



<center>	
	<h1>Juno FeeShare</h1>

	<FeeShare rpcEndpoint={rpcEndpoint} fee={fee} />

	<br>
	<hr>

	<TokenFactory rpcEndpoint={rpcEndpoint} fee={fee} />	

	<!-- if label is set, then show it as a h2
	{#if contract_label.length > 0}
		<h2>Contract: {contract_label}</h2>
	{/if}
	
	<div id="feeshare" class="div_center">
		<div class="row">
			<div class="col-25">
				<label for="contract_label">Method</label>
			</div>
			<div class="col-75">
				<select id="contract_label" name="contract_label" bind:value={method}>
					<option value="register" selected>Register</option>
					<option value="update">Update</option>					
				</select>
			</div>
		</div>
		
		<div class="row">
			<div class="col-25">
				<label for="contract_addr">Contract Address</label>
			</div>
			<div class="col-75">							
				{#if contract_addr.length != contract_addr_len}
					<style>
						#contract_addr {
							background-color: #ffcccc;
						}
					</style>										
				{:else}				
					{#await query_contract_info()}						
					{:then res}						
					{:catch error}						
					{/await}
				{/if}			

				<input id="contract_addr" name="contract_addr" type="text" placeholder="Enter contract address" bind:value={contract_addr} />
			</div>
			
			{#if method == "update"}
				<div class="col-25">
					<label for="new_address">New Withdraw Address</label>
				</div>
				<div class="col-75">							
					{#if new_address.length != juno_addr_len}
						<style>
							#new_address {
								background-color: #ffcccc;
							}
						</style>
					{/if}
					<input id="new_address" name="new_address" type="text" placeholder="Enter new address" bind:value={new_address} />
				</div>
			{/if}

				<div class="row">
					<input type="submit" value="{method} contract" on:click={() => feeshare_contract()} />		
				</div>
		</div>	

		<br>
		<hr>


		<input id="tokenfactory_input" name="tokenfactory_input" type="text" placeholder="Enter tokenfactory denom" bind:value={tokenfactory_addr} />
				
		<div class="row">
			<input type="submit" value="Query tokenfactory tokens" on:click={() => query_tokenfactory_tokens()} />
		</div>  

	</div> -->
</center>


<style>		
	/* make all font 1.2em */
	* {
		font-size: 1.1em;
	}
</style>
