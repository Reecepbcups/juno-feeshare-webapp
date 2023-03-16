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

	// Component Specific
	let contract_label = '';
	let method = 'register';
	let contract_addr = '';
	let new_address = '';

	const contract_addr_len = 'juno1qsrercqegvs4ye0yqg93knv73ye5dc3prqwd6jcdcuj8ggp6w0us66deup'.length;
	const juno_addr_len = 'juno10r39fueph9fq7a6lgswu4zdsg8t3gxlq670lt0'.length;

	let controlling_contract_account = '';

	const query_contract_info = async (): Promise<boolean> => {
		// returns false if the user can NOT update / register the contract
		let cw_query = await cosmwasm.ClientFactory.createRPCQueryClient({ rpcEndpoint });

		let c_info = await cw_query.cosmwasm.wasm.v1
			.contractInfo({ address: contract_addr })
			.then((res) => {
				return res;
			})
			.catch((e) => {
				return undefined;
			});

		// const c_info = await query_client.wasm.getContractInfo(contract_addr);
		console.log(contract_addr, c_info);

		if (c_info) {
			const creator = c_info.contractInfo?.creator || '';
			const admin = c_info.contractInfo?.admin || '';
			contract_label = c_info.contractInfo?.label || '';

			if (admin.length > 0) {
				controlling_contract_account = admin;
			} else {
				controlling_contract_account = creator;
			}

			// if admin length is longer than a normal account, its a contract.
			if (admin.length > juno_addr_len) {
				// if it errors, its not an admin contract.
				await cw_query.cosmwasm.wasm.v1
					.contractInfo({ address: contract_addr })
					.then((res) => {
						// toast.error(`Admin is a contract. You can not change the withdraw address`, toast_style);
						// toast.push(`Admin is a contract. You can not change the withdraw address`, error);
						error_notification('Admin is a contract. You can not change the withdraw address');
						return false;
					})
					.catch((e) => {
						controlling_contract_account = admin;
						// toast.push(`Admin is a user. You can change the withdraw address`, success);
						success_notification('Admin is a user. You can change the withdraw address');
						// check if they the admin is their address?
					});
			}
		} else {
			// not a valid contract
			error_notification('Contract address is not on chain.');
			return false;
		}
		return true;
	};

	const feeshare_contract = async () => {
		// if contract_addr.length != contract_addr_len, return and show an error
		if (contract_addr.length != contract_addr_len) {
			// toast.error(`Contract address is not valid.`, toast_style);
			// toast.push(`Contract address is not valid.`, error);
			error_notification('Contract address is not valid.');
			return;
		}

		let signer: OfflineSigner = await get_wallet_for_chain(chain_id);
		let address = (await signer.getAccounts())[0].address;

		let res = await query_contract_info();
		if (res == false) {
			return;
		}

		console.log(controlling_contract_account, address);
		if (controlling_contract_account != address) {
			// toast.error(`You are not the admin of this contract.`, toast_style);
			// toast.push(`You are not the admin of this contract.`, error);
			// let controlling_html = `<a href="https://www.mintscan.io/juno/account/${controlling_contract_account}" target="_blank">mintscan.io/account</a>`;
			error_notification(
				`You are not the admin or creator.\nThey are:\n${controlling_contract_account}`
			);
			return;
		}

		let msg;
		let signing_client = getSigningJunoClient({ rpcEndpoint, signer });
		if (method == 'register') {
			const { registerFeeShare } = juno.feeshare.v1.MessageComposer.withTypeUrl;
			msg = registerFeeShare({
				contractAddress: contract_addr,
				deployerAddress: controlling_contract_account,
				withdrawerAddress: new_address
			});
		} else {
			const { updateFeeShare } = juno.feeshare.v1.MessageComposer.withTypeUrl;
			msg = updateFeeShare({
				contractAddress: contract_addr,
				deployerAddress: controlling_contract_account,
				withdrawerAddress: new_address
			});
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

<h1>Juno FeeShare</h1>

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
			<label for="contract_addr">Contract</label>
		</div>

		<div class="col-75">
			<input
				id="contract_addr"
				name="contract_addr"
				type="text"
				placeholder="Enter contract address"
				bind:value={contract_addr}
			/>


			{#if new_address.length < juno_addr_len}
				<style>
					#withdraw_address {
						background-color: #ffcccc;
					}
				</style>
			{/if}

			{#if contract_addr.length != contract_addr_len}
				<style>
					#contract_addr {
						background-color: #ffcccc;
					}
				</style>
			{:else}
				{#await query_contract_info()}
					<!-- <p>awaiting...</p> -->
				{:then res}
					<!-- <p>resolved: {res}</p> -->
				{:catch error}
					<!-- <p>rejected: {error.message}</p> -->
				{/await}
			{/if}

		
			<!-- <input
				id="withdraw_address"
				name="withdraw_address"
				type="text"
				placeholder="Enter Withdraw Rewards Address"
				bind:value={new_address}
			/> -->
		</div>

		{#if method == 'update'}
			<!-- <div class="col-25">
				<label for="new_address">New Withdraw Address</label>
			</div>			 -->
		{/if}

		<div class="col-75">
			{#if new_address.length != juno_addr_len}
				<style>
					#new_address {
						background-color: #ffcccc;
					}
				</style>
			{/if}

			{#if method == 'update'}
				<input
					id="withdraw_address"
					name="withdraw_address"
					type="text"
					placeholder="Enter Receiving Rewards Address"
					bind:value={new_address}
				/>
			{:else}
			<input
				id="withdraw_address"
				name="withdraw_address"
				type="text"
				placeholder="Enter New Rewards Address"
				bind:value={new_address}
			/>
			{/if}
		</div>

		<div class="row">
			<input type="submit" value="{method} contract" on:click={() => feeshare_contract()} />
		</div>
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
	select {
		width: 100%;
		padding: 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		resize: vertical;
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
