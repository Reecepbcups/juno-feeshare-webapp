<!-- 
    Reece Williams | Feb 2023 | Joe Webapp
    - Its JOE chain yo
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

	const fee = {amount: [{	amount: "100000",	denom: "ujuno",},], gas: "200000",};
	
	const CHAIN_ID = "juno-1"
	const rpcEndpoint = "https://rpc.juno.strange.love/"			

	const contract_addr_len = 63
	const juno_addr_len = 43

	// user variables
	const WALLET_PREFIX = "juno"
	let contract_addr = "" //juno1d7yjapmwerm6qxaxtuyefmcns45x9x6d78gys9uhfsdpkfs4dxfssgw7ap
	let method = "register" // and update
	let controlling_contract_account = ""
	let contract_label = ""	

	let new_address = ""

	// Functions
	const get_wallet_for_chain = async (
		chain_id: string
	): Promise<OfflineAminoSigner | OfflineDirectSigner> => {
		// open keplr
		const keplr = window as KeplrWindow;
		if (keplr === undefined) {			
			throw new Error('Keplr not found');
		}		

		let signer = keplr.getOfflineSignerAuto;
		if (signer === undefined) {
			throw new Error('Keplr not found');
		}

		return signer(chain_id);
	};

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

	const query_contract_info = async (): Promise<boolean> =>  {
		// returns false if the user can NOT update / register the contract			
		let cw_query = (await cosmwasm.ClientFactory.createRPCQueryClient({rpcEndpoint}));
		
		let c_info = await cw_query.cosmwasm.wasm.v1.contractInfo({address: contract_addr}).then(res => {
			return res
		}).catch(e => {
			return undefined
		})

		// const c_info = await query_client.wasm.getContractInfo(contract_addr);		
		console.log(contract_addr, c_info)

		if(c_info) {
			const creator = c_info.contractInfo?.creator || "";
			const admin = c_info.contractInfo?.admin || "";
			contract_label = c_info.contractInfo?.label || "";

			if(admin.length > 0) {
				controlling_contract_account = admin
			} else {
				controlling_contract_account = creator
			}			

			// if admin length is longer than a normal account, its a contract.
			if(admin.length > "juno10r39fueph9fq7a6lgswu4zdsg8t3gxlq670lt0".length) {
				// if it errors, its not an admin contract.
				await cw_query.cosmwasm.wasm.v1.contractInfo({address: contract_addr}).then(res => {
					// toast.error(`Admin is a contract. You can not change the withdraw address`, toast_style);
					// toast.push(`Admin is a contract. You can not change the withdraw address`, error);
					error_notification("Admin is a contract. You can not change the withdraw address")
					return false;
				}).catch(e => {
					controlling_contract_account = admin
					// toast.push(`Admin is a user. You can change the withdraw address`, success);
					success_notification("Admin is a user. You can change the withdraw address")
					// check if they the admin is their address?				
				})
			}						
		} else {
			// not a valid contract
			error_notification("Contract address is not on chain.")
			return false;
		}			
		return true;
	}	

	const feeshare_contract = async () => {

		// if contract_addr.length != contract_addr_len, return and show an error
		if(contract_addr.length != contract_addr_len) {
			// toast.error(`Contract address is not valid.`, toast_style);
			// toast.push(`Contract address is not valid.`, error);
			error_notification("Contract address is not valid.")
			return
		}

		let signer: OfflineSigner = await get_wallet_for_chain(CHAIN_ID);
		let address = (await signer.getAccounts())[0].address;

		let res = await query_contract_info();
		if(res == false) {
			return
		}

		console.log(controlling_contract_account, address)
		if(controlling_contract_account != address) {
			// toast.error(`You are not the admin of this contract.`, toast_style);
			// toast.push(`You are not the admin of this contract.`, error);
			let controlling_html = `<a href="https://www.mintscan.io/juno/account/${controlling_contract_account}" target="_blank">mintscan.io/account</a>`
			error_notification(`You are not the admin or creator.<br>You can not modify it.<br><br>Controller: ${controlling_html}`)
			return
		}

		let msg;
		let signing_client = getSigningJunoClient({rpcEndpoint, signer});
		if(method == "register") {
			const { registerFeeShare } = juno.feeshare.v1.MessageComposer.withTypeUrl;
			msg = registerFeeShare({
				contractAddress: contract_addr,
				deployerAddress: controlling_contract_account,
				withdrawerAddress: new_address
			})
		} else {
			const { updateFeeShare } = juno.feeshare.v1.MessageComposer.withTypeUrl;
			msg = updateFeeShare({
				contractAddress: contract_addr,
				deployerAddress: controlling_contract_account,
				withdrawerAddress: new_address
			})
		}

		if(method=="tokenfactory") {
			const { createDenom } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
			msg = createDenom({
				sender: address,
				subdenom: "js-denom",
			});
			signing_client = getSigningOsmosisClient({rpcEndpoint, signer});
		}
							
		(await signing_client).signAndBroadcast(address, [msg], fee, "memo").then((res) => {
			console.log(res)	
			
			let URL = `https://www.mintscan.io/juno/txs/${res.transactionHash}`
			let html_url = `<a href=${URL}>mintscan.io/juno/txs/${res.transactionHash}</a>`
			if(res.code == 0) {
				// toast.push(`Success\n\n${html_url}`, success);		
				success_notification(`Success\n\n${html_url}`)
				// <span>
				// 	Custom and <b>bold</b>
				// 	<button on:click={() => toast_.dismiss(toast.id)}>Dismiss</button>
				// </span>		
			} else {
				// toast.push(`Error: ${res.rawLog}\n\n${html_url}`, error);

				// split the res.rawLog on the last : and get the last part

				if(!res.rawLog) {
					error_notification(`Error: ${html_url}\n\n${html_url}`)
					return
				}

				let final_log = res.rawLog.split(":").pop()

				error_notification(`Error: ${final_log}\n\n${html_url}`)
			}
			
			
		}).catch((e) => {
			console.log(e)
			// toast.push(`Error: ${e}`, error);
			error_notification(`Error: ${e}`)
		})	
	}

</script>

<!-- <Toaster /> -->
<SvelteToast />



<center>	
	<h1>Juno FeeShare</h1>

	<!-- if label is set, then show it as a h2 -->
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
					<option value="tokenfactory">tokenfactory</option>
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
				<!-- We get the contract label and make it visible on the page -->
					{#await query_contract_info()}
						<!-- <p>awaiting...</p> -->
					{:then res}
						<!-- <p>resolved: {res}</p> -->
					{:catch error}
						<!-- <p>rejected: {error.message}</p> -->
					{/await}
				{/if}
				


				<input id="contract_addr" name="contract_addr" type="text" placeholder="Enter contract address" bind:value={contract_addr} />
			</div>

			<!-- if method is update, show another div which allows text input for a normal address -->
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
		
		<!-- crete a button which on click calls query_tokenfactory_tokens async -->
		<div class="row">
			<input type="submit" value="Query tokenfactory tokens" on:click={() => query_tokenfactory_tokens()} />
		</div>

	</div>
</center>


<style>		
	/* make all font 1.2em */
	* {
		font-size: 1em;
	}

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
		content: "";
		display: table;
		clear: both;		
	}

	label {
		padding: 12px 12px 12px 0;
		display: inline-block;
	}

	input[type=text], select {
		width: 100%;
		padding: 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		resize: vertical;
	}

	input[type=submit] {
		background-color: #4CAF50;
		color: white;
		padding: 12px 20px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		float: right;
		/* margin-right: 5%; */
	}
</style>
