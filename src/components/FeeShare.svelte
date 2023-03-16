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


<!-- {#if contract_label.length > 0}
	<h2>Contract: {contract_label}</h2>
{/if} -->



<div id="feeshare" class="container">
	<h1>Juno Feeshare</h1>

	<form on:submit={feeshare_contract}>

		<select bind:value={method}>		
			<option value="register" selected>Register</option>
			<option value="update">Update</option>
		</select>

		<input id="contract_addr" type="text" placeholder="Enter contract address" bind:value={contract_addr}>

		{#if method == 'register'}			
			{#if new_address.length >= juno_addr_len}
				{#await query_contract_info()}
					<!-- <p>awaiting...</p> -->
				{:then res}
					<!-- <p>resolved: {res}</p> -->
				{:catch error}
					<!-- <p>rejected: {error.message}</p> -->
				{/await}					
			{/if}

			<input id="withdraw_address" type="text" placeholder="Enter withdraw address" bind:value={new_address}>

		
		{:else if method == 'update'}
			<!-- new withdraw adderss -->
			<input id="withdraw_address" type="text" placeholder="Enter new withdraw address" bind:value={new_address}>
		{/if}		

		<input type="submit" value="{method}">
	</form>

</div>

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
