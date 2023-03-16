<script lang="ts">
	import { osmosis, getSigningOsmosisClient } from 'juno-network';
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

	let show_last_txs = false

	// let last_tx_hashes: string[] = [];
	let last_txs = new Map<string, string>();
	last_txs.set('create', 'testtx');
	const add_tx_hash = (type: string, tx_hash: string) => {		
		last_txs.set(type, tx_hash);		
		//may do other things here in the future
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

			case 'changeadmin':
				const { changeAdmin } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
				msg = changeAdmin({
					sender: address,
					denom: full_denom,
					newAdmin: new_admin
				});

				if (new_admin.length >= juno_addr_len) {
					error_notification('New admin address is not valid');
					return;
				}

				if (full_denom.length == 0) {
					error_notification('Denom cannot be empty');
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

<h2 class="text-2xl font-semibold mb-4">Juno TokenFactory</h2>

<!-- on the far right of the sceen, have a side bar which shows the numbers 1 2 and 3 going down via a UL -->



<div id="tokenfactory" class="div_center">
	<div class="flex items-center mb-4">
		<select
			id="contract_label"
			name="contract_label"
			bind:value={method}
			class="w-1/3 p-2 border border-gray-300 rounded ml-auto text-center"
		>
			<option value="create" selected>Create</option>
			<option value="mint">Mint</option>
			<option value="burn">Burn</option>
			<option value="changeadmin">Change Admin</option>
			<option value="metadata">Metadata</option>
		</select>
	</div>

	<div>
		{#if method == 'create'}
			<div class="flex mb-4">
				<div class="w-3/4">
					<input
						id="sub_denom"
						name="sub_denom"
						type="text"
						placeholder="Enter sub denom name"
						bind:value={sub_denom}
						class="w-full p-2 border border-gray-300 rounded"
					/>
				</div>
			</div>

			<div class="flex mb-4">
				<input
					type="submit"
					value={method}
					on:click={() => tf_execute()}
					class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
				/>
			</div>
		{:else if method == 'burn'}
			<br />
			<div class="flex mb-4">
				<center>
					<input
						type="submit"
						value="Get Current Denoms"
						on:click={() => query_my_denoms()}
						class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
					/>
				</center>
			</div>
			<br />

			{#if my_denoms.length > 0}
				<div class="w-3/4" style="margin-top: 5%;">
					<select
						id="denom"
						name="denom"
						bind:value={full_denom}
						class="w-full p-2 border border-gray-300 rounded"
					>
						{#each my_denoms as denom, idx}
							<option value={denom}>{denom}</option>
						{/each}
					</select>

					<input
						id="amount"
						name="amount"
						type="number"
						placeholder="0"
						bind:value={amount}
						min="0"
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>
				</div>

				<div class="flex mb-4">
					<input
						type="submit"
						value={method}
						on:click={() => tf_execute()}
						class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
					/>
				</div>
			{:else}
				<div class="flex mb-4">
					<center>
						<p>No denoms found</p>
					</center>
				</div>
			{/if}
		{:else if method == 'changeadmin'}
			<br />
			<div class="flex mb-4">
				<center>
					<input
						type="submit"
						value="Get Current Denoms"
						on:click={() => query_my_denoms()}
						class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
					/>
				</center>
			</div>
			<br />

			{#if my_denoms.length > 0}
				<div class="w-3/4" style="margin-top: 5%;">
					<select
						id="denom"
						name="denom"
						bind:value={full_denom}
						class="w-full p-2 border border-gray-300 rounded"
					>
						{#each my_denoms as denom, idx}
							<option value={denom}>{denom}</option>
						{/each}
					</select>

					<!-- text input with exact length of juno-address -->
					<input
						id="new_admin"
						name="new_admin"
						type="text"
						placeholder="Enter new admin address"
						bind:value={new_admin}
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>
				</div>

				<div class="flex mb-4">
					<input
						type="submit"
						value={method}
						on:click={() => tf_execute()}
						class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
					/>
				</div>
				<!-- manual input box for a denom. This needs to be used for the Mint section as well? (until we get a query who is the admin of a denom query)-->
			{:else}
				<input
					id="denom"
					name="denom"
					type="text"
					placeholder="Enter full denom manually"
					bind:value={full_denom}
					class="w-full p-2 border border-gray-300 rounded mb-4"
				/>

				<!-- if full_denom length > 0, show an input for the admin text box and a button to submit -->
				{#if full_denom.length > 0}
					<input
						id="new_admin"
						name="new_admin"
						type="text"
						placeholder="Enter new admin address"
						bind:value={new_admin}
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>

					<div class="flex mb-4">
						<input
							type="submit"
							value={method}
							on:click={() => tf_execute()}
							class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
						/>
					</div>
				{:else}
					<div class="flex mb-4">
						<center>
							<p>No denoms found</p>
						</center>
					</div>
				{/if}
			{/if}
		{:else if method == 'mint'}
			<br />
			<div class="flex mb-4">
				<center>
					<input
						type="submit"
						value="Get Current Denoms"
						on:click={() => query_my_denoms()}
						class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
					/>
				</center>
			</div>
			<br />

			{#if my_denoms.length > 0}
				<div class="w-3/4" style="margin-top: 5%;">
					<select
						id="denom"
						name="denom"
						bind:value={full_denom}
						class="w-full p-2 border border-gray-300 rounded"
					>
						{#each my_denoms as denom, idx}
							<option value={denom}>{denom}</option>
						{/each}
					</select>

					<input
						id="amount"
						name="amount"
						type="number"
						placeholder="0"
						bind:value={amount}
						min="0"
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>
				</div>

				<div class="flex mb-4">
					<input
						type="submit"
						value={method}
						on:click={() => tf_execute()}
						class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
					/>
				</div>
			{:else}
				<div class="flex mb-4">
					<center>
						<p>No denoms found</p>
					</center>
				</div>
			{/if}
		{:else if method == 'metadata'}
			<br />
			<div class="flex mb-4">
				<center>
					<input
						type="submit"
						value="Get Current Denoms"
						on:click={() => query_my_denoms()}
						class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
					/>
				</center>
			</div>
			<br />

			{#if my_denoms.length > 0}
				<div class="w-3/4" style="margin-top: 5%;">
					<select
						id="denom"
						name="denom"
						bind:value={full_denom}
						class="w-full p-2 border border-gray-300 rounded"
					>
						{#each my_denoms as denom, idx}
							<option value={denom}>{denom}</option>
						{/each}
					</select>

					<!-- display name input -->
					<input
						id="display"
						name="display"
						type="text"
						placeholder="Display Name"
						bind:value={display}
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>
					<!-- description -->
					<input
						id="description"
						name="description"
						type="text"
						placeholder="Description"
						bind:value={description}
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>
					<!-- ticker symbol, with current value of $TICKER -->
					<input
						id="symbol"
						name="symbol"
						type="text"
						placeholder="Ticker Symbol"
						bind:value={ticker}
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>
					<!-- exponent -->
					<input
						id="exponent"
						name="exponent"
						type="number"
						placeholder="Exponent"
						bind:value={exponent}
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>

					<!-- uri data -->
					<input
						id="uri"
						name="uri"
						type="text"
						placeholder="URI (optional)"
						bind:value={uri_link}
						class="w-full p-2 border border-gray-300 rounded mb-4"
					/>
				</div>

				<div class="flex mb-4">
					<input
						type="submit"
						value={method}
						on:click={() => tf_execute()}
						class="bg-green-500 text-white py-2 px-4 rounded cursor-pointer ml-auto"
					/>
				</div>
			{:else}
				<div class="flex mb-4">
					<center>
						<p>No denoms found</p>
					</center>
				</div>
			{/if}
		{/if}
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

	input[type='text'],
	input[type='number'],
	select {
		/* increase text size */
		font-size: 1.1em;

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
