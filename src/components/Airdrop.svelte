<script lang="ts">
	import {
		juno,
		cosmwasm,
		osmosis,
		router,
		getSigningJunoClient,
		getSigningOsmosisClient
	} from 'juno-network';
	import { get_wallet_for_chain } from '../wallet';
	import type { OfflineSigner } from '@cosmjs/proto-signing';
	import { error_notification, success_notification } from './Status.svelte';
	


	const EXPORT_URL = "https://exports.reece.sh/juno";

	// get rpcEndpoint from the main page route
	export let rpcEndpoint = 'https://juno-rpc.reece.sh:443';
	export let fee = { amount: [{ amount: '1000', denom: 'ujuno' }], gas: '200000' };
	let chain_id = 'juno-1';

	// create a function which queries a website
	// and returns the response:

	let available_heights: string[] = []

	const get_exports = async () => {		
		const response = await fetch(EXPORT_URL + "/");
		const html = await response.text();
		// console.log(html);		

		const heights: string[] = []
		const regex = /(\d+)(.tar.xz)/g;

		let m;
		while ((m = regex.exec(html)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === regex.lastIndex) {
				regex.lastIndex++;
			}
			// The result can be accessed through the `m`-variable.
			m.forEach((match, groupIndex) => {
				if(groupIndex == 1) {	
					if(!heights.includes(match)) {					
						heights.push(match)
					}					
				}
			});
		}
		
		// console.log(heights)
		available_heights = heights		

		return available_heights
	}

	const do_airdrop = async () => {

	}


	let selected_height = 0
	const download = async () => {
		const file = `${selected_height}.tar.xz`
		const url = `${EXPORT_URL}/${file}`
		console.log(`Downloading ${url}`)

		const response = await fetch(url);
		const theBlob = await response.blob();
				
		const a = document.createElement('a');
		a.href = window.URL.createObjectURL(theBlob);
		a.download = `${selected_height}.tar.xz`;
		a.click();

		// // delete the element
		a.remove();

		// // delete the blob
		window.URL.revokeObjectURL(url);
	}

	let files: FileList | null = null;
	$: if (files) {
		// Note that `files` is of type `FileList`, not an Array:
		// https://developer.mozilla.org/en-US/docs/Web/API/FileList
		console.log(files);

		for (const file of files) {
			console.log(`${file.name}: ${file.size} bytes`);

			read_uploaded_file()
		}
	}

	interface Delegations {
		delegator_address: string
		shares: string
		validator_address: string		
	}

	let delegations: Delegations[] = []
	let num_of_delegators_loaded = 0
	const read_uploaded_file = async () => {
		if(files) {
			const file = files[0]
			const reader = new FileReader();
			reader.onload = async (e) => {
				let text = e.target?.result;
				if(text) {

					// if text is an array buffer, then convert it to a string
					if(text instanceof ArrayBuffer) {
						text = new TextDecoder().decode(text)
					}

					const json = JSON.parse(text)
					delegations = json.delegations
					console.log('!!delegations', delegations)

				}
			};
			reader.readAsText(file);			
		}

		num_of_delegators_loaded = delegations.length
	}

	interface UserTotalDelegation {
		delegator_address: string
		shares: Number			
	}
	let combined_delegations: UserTotalDelegation[] = []

	const combine_delegations = async () => {
		delegations.forEach((delegation) => {
			const user = combined_delegations.find((user) => user.delegator_address == delegation.delegator_address)
			if(user) {
				user.shares = new Number(user.shares).valueOf() + new Number(delegation.shares).valueOf()
			} else {
				combined_delegations.push({
					delegator_address: delegation.delegator_address,
					shares: Number(delegation.shares)
				})
			}
		})
	}

	const download_combined_delegations = async () => {
		// download combined delegations as a JSON file to the user
		const json = JSON.stringify(combined_delegations)
		const blob = new Blob([json], {type: 'application/json'});
		const url = window.URL.createObjectURL(blob);

		// download
		const a = document.createElement('a');
		a.href = window.URL.createObjectURL(blob);
		a.download = `${selected_height}.json`;
		a.click();

		// // delete the element
		a.remove();

		// // delete the blob
		window.URL.revokeObjectURL(url);
	}

</script>


<!-- {#if contract_label.length > 0}
	<h2>Contract: {contract_label}</h2>
{/if} -->



<div id="airdrop" class="container">
	<h1>Juno Airdrop</h1>

	<form on:submit={do_airdrop}>

		<!-- button to call get_exports -->
		<button on:click={get_exports}>Get Exports</button>

		<!-- if avaliable_heights is not [], then show them in groups of 1_000_000 as a drop down -->
		{#if available_heights.length > 0}
			<p>Juno Block Height</p>
			<!-- select with a bind to selected_height -->
			<select bind:value={selected_height}>				
				{#each available_heights as height}
					<option value={height}>{new Number(height).toLocaleString('en-US')}</option>					
				{/each}
			</select>

			<!-- button which says download -->
			<button on:click={download}>Download Snapshot</button>

			<hr>
			<br>
			<br>
			<label for="json">Upload a Staking or Balances file from the download:</label>
			<input
				accept="application/json"
				bind:files
				id="json"
				name="json"
				type="file"
			/>

			<!-- button on click show delegations as a li -->
			<button on:click={read_uploaded_file}>Show Delegations</button>		
			
			<!-- if num_of_delegators_loaded is not 0, then show num_of_delegators_loaded -->
			{#if num_of_delegators_loaded > 0}
				<p>Number of Delegators: {num_of_delegators_loaded}</p>
			{/if}

			<!-- <ul>
				{#each delegations as delegation}
					<li>{delegation.delegator_address} {delegation.shares}</li>
				{/each}
			</ul> -->

			<!-- button to download combined_delegations as JSON -->
			<button on:click={combine_delegations}>Combine Delegations</button>

			<!-- download combined_delegations -->			
			<button on:click={download_combined_delegations}>Download Combined Delegations</button>			
			
		{/if}


	</form>

</div>

<style>
	* {
    font-size: 1.0em;
	}

	@media (min-width:650px){
		.container {
			background-color: #333;
			padding: 24px;
			margin-top: 100px;
			border-radius: 16px;
			width: 600px;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			margin-left: auto;
			margin-right: auto;
			box-shadow: 15px 20px 30px #444444;
			border: 1px solid #000;
		}
	}

	@media (max-width:650px){
		.container {
			background-color: #333;
			padding: 24px;
			margin-top: 100px;
			border-radius: 16px;
			width: 80%;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			margin-left: auto;
			margin-right: auto;
			box-shadow: 15px 20px 30px #444444;
			border: 1px solid #000;
		}
	}

	input[type="text"] {
		margin: 8px;
		padding: 8px;
		border: none;
		border-radius: 8px;
		background-color: #222;
		color: #fff;
		font-size: 16px;
		width: 98%; 
		/* idk why this input is longer than the select, but width-2 fixes it. Select has the same formating values */
	}
	select {
		margin: 8px;
		padding: 8px;
		border: none;
		border-radius: 8px;
		background-color: #222;
		color: #fff;
		font-size: 16px;
		width: 100%;
	}

	input[type="submit"] {
		margin: 16px;
		padding: 8px 16px;
		border: none;
		border-radius: 8px;
		background-color: #f5f5f5;
		color: #222;
		font-size: 16px;
		cursor: pointer;
	}

	button {
		margin: 8px;
		padding: 8px 16px;
		border: none;
		border-radius: 8px;
		background-color: #f6f6f6;
		color: #000;
		font-size: 16px;
		cursor: pointer;
	}

	h1 {
		font-size: 48px;
		margin-bottom: 32px;
		text-align: center;
	}
</style>
