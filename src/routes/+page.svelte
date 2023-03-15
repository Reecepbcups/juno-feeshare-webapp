<!-- 
    Reece Williams | Feb 2023 | Joe Webapp
    - Its JOE chain yo
-->
<script lang="ts">
	import type { Window as KeplrWindow } from '@keplr-wallet/types';
	import type { OfflineSigner } from '@cosmjs/proto-signing';

	import {juno, cosmwasm, getSigningCosmosClient, getSigningJunoClient} from 'juno-network'		

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

	// User Facing Information
	// let from_client: SigningStargateClient | SigningCosmWasmClient | undefined;
	
	// let query_client: QueryClient & WasmExtension | undefined; // QueryClient with Extensions	
	// let tendermint34_client: Tendermint34Client | undefined;

	// user variables
	const WALLET_PREFIX = "juno"
	let contract_addr = "juno1d7yjapmwerm6qxaxtuyefmcns45x9x6d78gys9uhfsdpkfs4dxfssgw7ap"
	let method = "register" // and register
	let controlling_contract_account = ""
	let contract_label = ""
	let user_addr = ""

	let new_address = "juno1reece3m8g4m3d0qrpj93rnnseudnpzhr0kewyl"

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
		}			
		return true;
	}	

	const feeshare_contract = async () => {
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
			let controlling_html = `<a href="https://www.mintscan.io/juno/account/${controlling_contract_account}" target="_blank">${controlling_contract_account}</a>`
			error_notification(`You are not the admin or creator.<br>You can not modify it.<br><br>Controller: ${controlling_html}`)
			return
		}

		let msg;
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
			
		let signing_client = getSigningJunoClient({rpcEndpoint, signer});			

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
				error_notification(`Error: ${res.rawLog}\n\n${html_url}`)
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

<h1>Juno FeeShare</h1>


<center>
	<!-- button to call query_contract_info -->
	<button on:click={() => query_contract_info()}>Query Contract Info</button>

	<div id="reviews" class="div_center">
		<!-- <textarea id="contract_addr" name="contract_addr" rows="4" cols="50" placeholder="Enter contract address" bind:value={contract_addr}></textarea> -->
		<br />
		
		<label for="contract_label">Contract Label</label>
		<select id="contract_label" name="contract_label" bind:value={method}>
			<option value="register" selected>Register</option>
			<option value="update">Update</option>
		</select>

		<br>
		<br>
		<input type="submit" value="feeshare {method}" on:click={() => feeshare_contract()} />		

		
		<br>
		<label for="contract_addr">Contract Address</label>		
		<input id="contract_addr" name="contract_addr" type="text" placeholder="Enter contract address" bind:value={contract_addr} />

	</div>
</center>


<style>
	* {
		font-family: 'Nunito Sans', sans-serif;
	}

	:global(body) {
		background-color: #ffffff;
	}

	h1,	
	h4,
	p {
		text-align: center;
		color: black;
	}

	#review_text {
		width: 100%;
	}

	.div_center {
		border: 1px solid black;
		padding: 10px;
		margin: 10px;
		max-width: 50%;
		float: none !important;
		text-align: center;
	}

	ul {
		list-style: none;
	}

	li {
		padding-bottom: 10px;
	}

	input[type='submit'] {
		background-color: #5e72e4;
		color: white;
		padding: 16px 32px;
		text-align: center;
		text-decoration: none;
		display: inline-block;
		font-size: 16px;
		margin: 4px 2px;
		cursor: pointer;
		border-radius: 8px;
	}
</style>
