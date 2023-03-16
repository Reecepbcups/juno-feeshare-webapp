<style>
	* {
    font-size: 1.0em;
	}

	.container {
		background-color: #333;
		padding: 24px;
		border-radius: 16px;
		width: 80%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		margin: 0 auto;
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

<script lang="ts">
	import { osmosis, cosmos, getSigningOsmosisClient } from 'juno-network';
	import { get_wallet_for_chain } from '../wallet';
	import type { OfflineSigner } from '@cosmjs/proto-signing';
	import { error_notification, success_notification } from '../components/Status.svelte';

	// get rpcEndpoint from the main page route
	export let rpcEndpoint = '';
	export let fee = { amount: [{ amount: '1000', denom: 'ujuno' }], gas: '200000' };
	let chain_id = 'juno-1';

	let method = 'create';
	const juno_addr_len = 43; // normal user addr

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
		if (user_address.length == 0) {
			// show button to connect wallet
			get_wallet_for_chain(chain_id).then(async (signer) => {
				user_address = (await signer.getAccounts())[0].address;
				query_my_denoms();
			});
		}

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
		let signer: OfflineSigner = await get_wallet_for_chain(chain_id);
		let address = (await signer.getAccounts())[0].address;

		let msg;
		let signing_client = getSigningOsmosisClient({ rpcEndpoint, signer });		

		switch (method) {
			case 'create':
				const { createDenom } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = createDenom({
					sender: address,
					subdenom: sub_denom
				});

				if (sub_denom.length == 0) {
					error_notification('Subdenom cannot be empty');
					return;
				}
				break;

			// todo, add a mint and burn in 1. make a Tx builder class?
			case 'mint':
				const { mint } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = mint({
					sender: address,
					// Coin
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
					sender: address,
					// Coin
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
								
				if (new_admin.length <= juno_addr_len) {
					error_notification('New admin address is not valid');					
					return;
				}

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

				if (recipient.length < juno_addr_len) {
					error_notification(`to address ${recipient}\nis not valid`);
					return;
				}

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
		let popup = window.open('', 'popup', 'width=600,height=600');
		if(popup) {
			popup.document.write(`<pre>${JSON.stringify(msg, null, 2)}</pre>`);
			popup.document.write(`<button onclick="window.close()">Close</button>`);						
		}

		(await signing_client)
			.signAndBroadcast(address, [msg], fee, 'memo')
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

	  <!-- Selector for actions to do -->
	  <select bind:value={method}>		
		<option value="create" selected>Create (Cost 1 JUNO)</option>
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
	  	<button on:click={query_my_denoms} type="button">Query My Denoms</button>
			<select bind:value={full_denom}>
	  		{#each my_denoms as denom}
	  			<option value={denom} selected>{denom}</option>
	  		{/each}
			</select>
	  	<input type="text" placeholder="Enter amount to burn" bind:value={amount}>

	  {:else if method == 'mint'}
	  	<button on:click={query_my_denoms} type="button">Query My Denoms</button>
			<select bind:value={full_denom}>
	  		{#each my_denoms as denom}
	  			<option value={denom}>{denom}</option>
	  		{/each}
			</select>
			<input type="text" placeholder="Enter amount to mint" bind:value={amount}>

	  {:else if method == 'change admin'}
	  	<button on:click={query_my_denoms} type="button">Query My Denoms</button>
			<select bind:value={full_denom}>
	  		{#each my_denoms as denom}
	  			<option value={denom}>{denom}</option>
	  		{/each}
			</select>
			<input type="text" placeholder="Enter new admin address" bind:value={new_admin}>

	  {:else if method == 'metadata'}
	  	<button on:click={query_my_denoms} type="button">Query My Denoms</button>
			<select bind:value={full_denom}>
	  		{#each my_denoms as denom}
	  			<option value={denom}>{denom}</option>
	  		{/each}
			</select>
			<input type="text" placeholder="Enter ticker" bind:value={ticker}>
			<input type="text" placeholder="Enter display" bind:value={display}>
			<input type="text" placeholder="Enter exponent" bind:value={exponent}>

	  {:else if method == 'send'}
	  	<button on:click={query_my_denoms} type="button">Query My Denoms</button>
			<select bind:value={full_denom}>
	  		{#each my_denoms as denom}
	  			<option value={denom}>{denom}</option>
	  		{/each}
			</select>
			<input type="text" placeholder="Enter amount to send" bind:value={amount}>
			<input type="text" placeholder="Enter recipient address" bind:value={recipient}>
	  {/if}
	  
	  <!-- <input type="text" placeholder="Input 1" bind:value={input1Value}>
	  <input type="text" placeholder="Input 2" bind:value={input2Value}> -->
	  <input type="submit" value="{method}">
  	</form>
  </div>
