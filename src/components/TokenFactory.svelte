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
	import { error_notification, success_notification } from '../components/Status.svelte';

	// get rpcEndpoint from the main page route
	export let rpcEndpoint = '';
	export let fee = { amount: [{ amount: '1000', denom: 'ujuno' }], gas: '200000' };
	let chain_id = 'juno-1';

	let method = 'create';	
	const juno_addr_len = 56; // Replace with the correct length

	let sub_denom = '';
	let full_denom = '';
	let new_admin = '';
	let amount = 0;

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
				break;

			// todo, add a mint and burn in 1. make a Tx builder class?
			case 'mint':
				const { mint } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = mint({
					sender: address,
					// Coin
					amount: { denom: full_denom, amount: amount.toString() }
				});
				break;

			case 'burn':
				const { burn } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = burn({
					sender: address,
					// Coin
					amount: { denom: full_denom, amount: amount.toString() }
				});
				break;

			case 'change':
				const { changeAdmin } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = changeAdmin({
					sender: address,
					denom: full_denom,
					newAdmin: new_admin
				});
				break;

			case 'metadata':
				const { setDenomMetadata } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = setDenomMetadata({
					sender: address,
					metadata: {
						description: 'description',
						base: full_denom,
						display: 'display',
						name: 'display',
						symbol: 'TICKER',
						denomUnits: [
							{
								aliases: ['TICKER'],
								denom: full_denom,
								exponent: 0
							},
							{
								aliases: [full_denom],
								denom: 'TICKER',
								exponent: 6
							}
						],
						uri: '', // on or off chain URL
						uriHash: '' // sha256 of this URL, optional
					}
				});
				break;

			default:
				alert('msg is undefined');
				return;
		}

		(await signing_client)
			.signAndBroadcast(address, [msg], fee, 'memo')
			.then((res) => {
				console.log(res);

				let URL = `https://www.mintscan.io/juno/txs/${res.transactionHash}`;
				let html_url = `<a href=${URL}>mintscan.io/juno/txs/${res.transactionHash}</a>`;
				if (res.code == 0) {
					// toast.push(`Success\n\n${html_url}`, success);
					success_notification(`Success\n\n${html_url}`);
					// <span>
					// 	Custom and <b>bold</b>
					// 	<button on:click={() => toast_.dismiss(toast.id)}>Dismiss</button>
					// </span>
				} else {
					// toast.push(`Error: ${res.rawLog}\n\n${html_url}`, error);

					// split the res.rawLog on the last : and get the last part

					if (!res.rawLog) {
						error_notification(`Error: ${html_url}\n\n${html_url}`);
						return;
					}

					let final_log = res.rawLog.split(':').pop();

					error_notification(`Error: ${final_log}\n\n${html_url}`);
				}
			})
			.catch((e) => {
				console.log(e);
				// toast.push(`Error: ${e}`, error);
				error_notification(`Error: ${e}`);
			});
	};
</script>

<h2>Juno TokenFactory</h2>

<div id="tokenfactory" class="div_center">
	<div class="row">
		<div class="col-25">
			<label for="contract_label">Method</label>
		</div>
		<div class="col-75">
			<select id="contract_label" name="contract_label" bind:value={method}>
				<option value="create" selected>Create</option>
				<option value="mint">Mint</option>
				<!-- <option value="burn">Burn</option>
				<option value="change">Change Admin</option>
				<option value="metadata">Metadata</option> -->
			</select>
		</div>
	</div>

	<div class="row">
		{#if method == 'create'}
			<div class="col-25">
				<label for="sub_denom">Sub Denom</label>
			</div>
			<div class="col-75">
				<input
					id="sub_denom"
					name="sub_denom"
					type="text"
					placeholder="Enter sub denom"
					bind:value={sub_denom}
				/>
			</div>

			<!-- button, on click call tf_execute -->
			<div class="row">
				<input type="submit" value={method} on:click={() => tf_execute()} />
			</div>


		{:else if method == 'mint'}
			<!-- button on click call query_my_denoms -->
			<input type="submit" value="Query My Denoms" on:click={() => query_my_denoms()} />
			<br />
			<br />
			

			<div class="col-25">
				<label for="sub_denom">Denom</label>
			</div>


			<!-- drop down selector using denoms -->
			<select id="denom" name="denom" bind:value={full_denom}>
				{#each my_denoms as denom, idx}			
					<!-- abstract away entire token name toggle? -->
					{#if idx == 1}
						<option value={denom} selected>{denom}</option>
					{:else}
						<option value={denom}>{denom}</option>
					{/if}					
				{/each}				
			</select>

			<input
					id="amount"
					name="amount"
					type="number"
					placeholder="0"
					bind:value={amount}
				/>

				<div class="row">
					<input type="submit" value={method} on:click={() => tf_execute()} />
				</div>					
		{/if}

		{#if method == 'update'}
			<div class="col-25">
				<label for="new_address">New Admin</label>
			</div>
			<div class="col-25">
				<!-- {#if new_address.length != juno_addr_len}
					<style>
						#new_address {
							background-color: #ffcccc;
						}
					</style>
				{/if}
				<input
					id="new_address"
					name="new_address"
					type="text"
					placeholder="Enter new address"
					bind:value={new_address}
				/> -->
			</div>
		{/if}

		<!-- <div class="row">
			<input type="submit" value="{method} contract" on:click={() => feeshare_contract()} />
		</div> -->
	</div>
</div>

<style>
	.div_center {
		width: 50%;
		margin: auto;
	}

	option {
		/* make round */
		border-radius: 0.5em;
	}

	.col-25 {
		float: left;
		width: 25%;
		margin-top: 6px;
	}

	.col-75 {
		float: left;
		width: 75%;
		margin-top: 6px;
	}

	.row:after {
		content: '';
		display: table;
		clear: both;
	}

	label {
		padding: 12px 12px 12px 0;
		display: inline-block;
	}

	input[type='text'],
	input[type='number'],
	select {
		width: 100%;
		padding: 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		resize: vertical;
	}

	/* select color black text */
	select {
		color: black;
	}

	input[type='submit'] {
		background-color: #4caf50;
		color: white;
		padding: 12px 20px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		float: right;
	}
</style>
