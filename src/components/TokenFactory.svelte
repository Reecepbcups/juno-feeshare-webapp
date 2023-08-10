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

	input[type="text"],
	input[type="number"] {
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
		font-size: 40px;
		margin-bottom: 32px;
		text-align: center;
	}

</style>

<script lang="ts">
	import { osmosis, cosmos, getSigningOsmosisClient } from 'juno-network';
	import { get_wallet_for_chain } from '../wallet';
	import type { OfflineSigner } from '@cosmjs/proto-signing';
	import { error_notification, success_notification } from '../components/Status.svelte';

	import {chains, JunoChain, type IChain} from '../scripts/chains';
   let selectedChain: IChain | undefined = chains.get("juno-1");	

  

	let method = 'create';	
	if (!selectedChain) {
	   selectedChain = JunoChain
   }
	let fee = { amount: [{ amount: '1000', denom: selectedChain.feeDenom }], gas: '200000' };

	let sub_denom = '';
	let full_denom = '';
	let new_admin = '';
	let amount = 0;	

	// let last_tx_hashes: string[] = [];
	let last_txs = new Map<string, string>();
	last_txs.set('create', 'testtx');
	const add_tx_hash = (type: string, tx_hash: string) => {		
		last_txs.set(type, tx_hash);		

		// modify the mintscan_links id to include the tx_hash
		let mintscan_links = document.getElementById('mintscan_links');
		if(mintscan_links) {
			// add a li to the mintscan_links ul
			let li = document.createElement('li');
			li.innerHTML = `<a href="https://mintscan.io/juno/txs/${tx_hash}" target="_blank">${type} - ${tx_hash}</a>`;
			mintscan_links.appendChild(li);
		}				
	};

	let user_address = '';
	let my_denoms: string[] = [];
	const query_my_denoms = async (): Promise<string[]> => {

		if (!selectedChain) {
			error_notification('Chain is not selected');
			return [];
		}

		if (user_address.length == 0) {
			// show button to connect wallet
			get_wallet_for_chain(selectedChain.chainId).then(async (signer) => {
				user_address = (await signer.getAccounts())[0].address;
				query_my_denoms();
			});
		}

		let rpcEndpoint = selectedChain.rpcEndpoint;
		let osmosis_query = await osmosis.ClientFactory.createRPCQueryClient({ rpcEndpoint });

		let denoms = await osmosis_query.osmosis.tokenfactory.v1beta1.denomsFromCreator({
			creator: user_address
		});

		my_denoms = denoms.denoms;
		console.log(my_denoms);
		return my_denoms;
	};

	let recipient = '';

	let display = '';
	let description = '';
	let ticker = '';
	let exponent = 6;
	let uri_link = '';
	const tf_execute = async () => {
		if (!selectedChain) {
			error_notification('Chain is not selected');
			return;
		}
		let signer: OfflineSigner = await get_wallet_for_chain(selectedChain.chainId);
		let address = (await signer.getAccounts())[0].address;		

		let msg;
		let rpcEndpoint = selectedChain.rpcEndpoint;
		let signing_client = getSigningOsmosisClient({ rpcEndpoint, signer });	
		
		// if full_denom does not start with fac factory/ , error out
		if(full_denom.length > 0 && !full_denom.startsWith('factory/')) {
			error_notification('Full denom must be factory/<YourAddress/Name');			
			return;
		}
				
		fee.gas = '220000';
		switch (method) {
			case 'create':
				fee.gas = '2300000';
				const { createDenom } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = createDenom({
					sender: address,
					subdenom: sub_denom
				});
				// fee.gas = '2300000'

				if (sub_denom.length == 0) {
					error_notification('Subdenom cannot be empty');
					return;
				}
				break;

			// todo, add a mint and burn in 1. make a Tx builder class?
			case 'mint':
				const { mint } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = mint({					
					mintToAddress: address,
					sender: address,
					amount: { denom: full_denom, amount: amount.toString() }
				});

				if (amount <= 0) {
					error_notification('Amount must be greater than 0');
					return;
				}
				break;

			case 'burn':
				const { burn } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = burn({
					burnFromAddress: address,
					sender: address,
					amount: { denom: full_denom, amount: amount.toString() }
				});

				if (amount <= 0) {
					error_notification('Amount must be greater than 0');
					return;
				}
				break;

			case 'change admin':
				const { changeAdmin } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = changeAdmin({
					sender: address,
					denom: full_denom,
					newAdmin: new_admin
				});				

				if (full_denom.length == 0) {
					error_notification('Denom cannot be empty');
					return;
				}
				break;

			case 'send':
				const { send } = cosmos.bank.v1beta1.MessageComposer.withTypeUrl;
				msg = send({
					fromAddress: address,
					toAddress: recipient,
					amount: [{ denom: full_denom, amount: amount.toString() }]
				});

				if (full_denom.length == 0) {
					error_notification('Denom cannot be empty');
					return;
				}				
				if (amount <= 0) {
					error_notification('Amount must be greater than 0');
					return;
				}
				break;

			case 'metadata':
				const { setDenomMetadata } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				ticker = ticker.toUpperCase();
				msg = setDenomMetadata({
					sender: address,
					metadata: {
						description: description,
						base: full_denom,
						display: ticker,
						name: display,
						symbol: ticker,
						denomUnits: [
							{
								aliases: [ticker],
								denom: full_denom,
								exponent: 0
							},
							{
								aliases: [full_denom],
								denom: ticker,
								exponent: exponent
							}
						],
						uri: uri_link,
						uriHash: ''
					}
				});
				if (ticker.length == 0) {
					error_notification('Ticker cannot be empty');
					return;
				}
				if (display.length == 0) {
					error_notification('Display cannot be empty');
					return;
				}
				if (full_denom.length == 0) {
					error_notification('Denom cannot be empty');
					return;
				}
				if (exponent <= 0 || exponent >= 100) {
					error_notification('Exponent must be between 1 and 99');
					return;
				}
				break;

			default:
				alert('msg is undefined');
				return;
		}

		// make a popup which shows the message
		// let popup = window.open('', 'popup', 'width=600,height=600');
		// if(popup) {
		// 	popup.document.write(`<pre>${JSON.stringify(msg, null, 2)}</pre>`);
		// 	popup.document.write(`<button onclick="window.close()">Close</button>`);						
		// }

		(await signing_client)
			.signAndBroadcast(address, [msg], fee, '')
			.then((res) => {
				console.log(res);

				const tx = res.transactionHash;
				const code = res.code;

				// let URL = `https://www.mintscan.io/juno/txs/${res.transactionHash}`;
				// let html_url = `<a href=${URL}>mintscan.io/juno/txs/${res.transactionHash}</a>`;
				if (code == 0) {
					success_notification(`Success\n\n${tx}`);
				} else {
					let final_log = res.rawLog?.split(':').pop();

					if (!res.rawLog) {
						error_notification(`Error: ${code}\n\n${tx}`);
						return;
					}

					error_notification(`Error: (${code})\n${final_log}\n\n${tx}`);
				}

				add_tx_hash(method, tx);
			})
			.catch((e) => {
				console.log(e);
				// toast.push(`Error: ${e}`, error);
				error_notification(`Error: ${e}`);
			});

	};
</script>


<!-- on the far right of the sceen, have a side bar which shows the numbers 1 2 and 3 going down via a UL -->

<div id="tokenfactory" class="container">
	<h1>Juno TokenFactory</h1>

	<form on:submit={tf_execute}>
		
		<select bind:value={selectedChain}>
			{#each Array.from(chains.values()) as chain}
				<option value={chain}>Chain {chain.chainId}</option>
			{/each}
		</select>

		{#if selectedChain?.chainId == 'custom'}				
			<input type="text" placeholder="Enter chain id" bind:value={selectedChain.chainId}>
			<input type="text" placeholder="Enter rpc endpoint" bind:value={selectedChain.rpcEndpoint}>
			<input type="text" placeholder="Enter fee denom" bind:value={selectedChain.feeDenom}>
		{/if}

	  <!-- Selector for actions to do -->
	  <select bind:value={method}>		
		<option value="create" selected>Create</option>
		<option value="mint">Mint</option>
		<option value="burn">Burn</option>
		<option value="change admin">Change Admin</option>
		<option value="metadata">Metadata</option>
		<option value="send">Send Tokens</option>
	  </select>

	  <!-- if statements for the actuals -->
	  {#if method == 'create'}
	  	<input type="text" placeholder="Enter sub denom name (ex: rac)" bind:value={sub_denom}>

	  {:else if method == 'burn'}
	  	<button on:click={query_my_denoms} type="button">Query My Created Denoms</button>

		<ul>
			{#each my_denoms as denom}
				<li>{denom}</li>
			{/each}
		</ul>

	  	<input type="text" placeholder="Enter Denom (factory/juno1.../name)" bind:value={full_denom}>
	  	<input type="number" placeholder="Enter amount to burn" bind:value={amount}>

	  {:else if method == 'mint'}
	  		<button on:click={query_my_denoms} type="button">Query My Denoms</button>
			<ul>
				{#each my_denoms as denom}
					<li>{denom}</li>
				{/each}
			</ul>

			<input type="text" placeholder="Enter Denom (factory/juno1.../name)" bind:value={full_denom}>
			<input type="text" placeholder="Enter amount to mint" bind:value={amount}>

	  {:else if method == 'change admin'}
	  		<button on:click={query_my_denoms} type="button">Query My Created Denoms</button>
			  <ul>
				{#each my_denoms as denom}
					<li>{denom}</li>
				{/each}
			</ul>
			<input type="text" placeholder="Enter Denom (factory/juno1.../name)" bind:value={full_denom}>

			<input type="text" placeholder="Enter new admin address" bind:value={new_admin}>

	  {:else if method == 'metadata'}
	  		<button on:click={query_my_denoms} type="button">Query My Created Denoms</button>
			<ul>
				{#each my_denoms as denom}
					<li>{denom}</li>
				{/each}
			</ul>
			<input type="text" placeholder="Enter Denom (factory/juno1.../name)" bind:value={full_denom}>

			<input type="text" placeholder="Enter ticker symbol (TICKER)" bind:value={ticker}>
			<input type="text" placeholder="Enter display (Joe Token)" bind:value={display}>
			<input type="text" placeholder="Enter exponent (6 typically)" bind:value={exponent}>

	  {:else if method == 'send'}
			<button on:click={query_my_denoms} type="button">Query My Created Denoms</button>
			<ul>
				{#each my_denoms as denom}
					<li>{denom}</li>
				{/each}
			</ul>

			<input type="text" placeholder="Enter Denom (factory/juno1.../name)" bind:value={full_denom}>

			<input type="text" placeholder="Enter amount to send" bind:value={amount}>
			<input type="text" placeholder="Enter recipient address" bind:value={recipient}>
	  {/if}
	  			  	
	  <!-- <input type="number" placeholder="Enter gas amount" bind:value={fee.gas}> -->
	  <!-- <input type="number" placeholder="Enter gas amount" bind:value={fee.gas}> -->

	  <!-- <input type="text" placeholder="Input 1" bind:value={input1Value}>
	  <input type="text" placeholder="Input 2" bind:value={input2Value}> -->
	  <input type="submit" value="{method}">
  	</form>
  </div>
