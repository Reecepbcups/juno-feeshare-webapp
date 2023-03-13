<!-- 
    Reece Williams | Feb 2023 | Joe Webapp
    - Its JOE chain yo
-->
<script lang="ts">
	import type { Window as KeplrWindow } from '@keplr-wallet/types';
	// import Review from '../components/Review.svelte'
	import type { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';
	import { SigningStargateClient, StargateClient, type StdFee } from '@cosmjs/stargate';

	// Signing (Keplr & Ledger)
	import type { OfflineAminoSigner } from '@cosmjs/amino';
	import type { OfflineDirectSigner } from '@cosmjs/proto-signing';

	import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
	import { HttpBatchClient } from '@cosmjs/tendermint-rpc/build/rpcclients';
	import { setupIbcExtension, QueryClient } from '@cosmjs/stargate';		

	//  setupCosmWasmExtension from cosmjs
	import { setupWasmExtension, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
	
	import type { WasmExtension } from '@cosmjs/cosmwasm-stargate';	
	import type { IbcExtension } from '@cosmjs/stargate';


	import toast, { Toaster, type ToastOptions } from 'svelte-french-toast';    
	import type { A } from 'vitest/dist/types-71ccd11d';
	const toast_style: ToastOptions = {
		position: 'top-right',
		duration: 6000,
		style: 'background: #333; color: #fff; width: 15%; font-size: 1.1rem;'
	};
	
	const CHAIN_ID = "juno-1"
	const RPC = "https://rpc.juno.strange.love/"			

	// User Facing Information
	let from_client: SigningStargateClient | SigningCosmWasmClient | undefined;
	let query_client: QueryClient & WasmExtension | undefined; // QueryClient with Extensions	
	let tendermint34_client: Tendermint34Client | undefined;

	// user variables
	const WALLET_PREFIX = "juno"
	let contract_addr = "juno1d7yjapmwerm6qxaxtuyefmcns45x9x6d78gys9uhfsdpkfs4dxfssgw7ap"
	let method = "update" // and register
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

	const query_contract_info = async () => {	
		if (tendermint34_client === undefined) {
			tendermint34_client = await Tendermint34Client.connect(RPC);
		}
		if(query_client === undefined) {			
			// let qclient: QueryClient & IbcExtension & WasmExtension = query_client as QueryClient & IbcExtension & WasmExtension;
			query_client = QueryClient.withExtensions(tendermint34_client, setupWasmExtension);			
		}		
	
		const c_info = await query_client.wasm.getContractInfo(contract_addr);		
		console.log(contract_addr, c_info)

		if(c_info) {
			const creator = c_info.contractInfo?.creator || "";
			const admin = c_info.contractInfo?.admin || "";
			const label = c_info.contractInfo?.label || "";

			controlling_contract_account = creator
			contract_label = label

			if(admin) {
				if(admin.length > 0) {
					// if it errors, its not an admin contract.
					await query_client.wasm.getContractInfo(admin).then((res) => {
						toast.error(`Admin is a contract. You can not change the withdraw address`, toast_style);
					}).catch((e) => {
						controlling_contract_account = admin
					});					
				}
			}
		}			
	}	

	const fee: StdFee = {
		amount: [
			{
				amount: "100000",
				denom: "ujuno",
			},
		],
		gas: "200000",
	};

	const feeshare_contract = async () => {
		let wallet = await get_wallet_for_chain(CHAIN_ID);
		let address = (await wallet.getAccounts())[0].address;

		await query_contract_info();

		const message = {
			"feeshare": {
				"contract": contract_addr,
				"address": address
			}
		}

		from_client = await SigningStargateClient.connectWithSigner(RPC, wallet, {
			prefix: WALLET_PREFIX
		});

		if (from_client === undefined) {
			throw new Error('from_client not found');
		}	

		// use from_client to make a custom message

		const msg = {
			typeUrl: "/juno.feeshare.v1.MsgRegisterFeeShare",
			value: {
				contract_address: contract_addr,
				deployer_address: controlling_contract_account,
				withdrawer_address: new_address
			}
		}

		// sign the custom type message msg
		const signed = await from_client.sign(address, [msg], fee, "memo");

		const result = await from_client.broadcastTx(signed.bodyBytes);

		// if (result.code === undefined) {
		// 	toast.success(`Success`, toast_style);
		// } else {
		// 	toast.error(`Error: ${result.rawLog}`, toast_style);
		// }

		console.log(result);		
	}

	// 	await from_client.execute(
	// 		address,
	// 		REVIEWS_CONTRACT_ADDRESS,
	// 		msg,
	// 		fee		
	// 	).then((res) => {
	// 		console.log(res)
	// 		toast.success(
	// 			`Review Transaction @ height ${res.height}\n\nTxHash: ${res.transactionHash}`,
	// 			toast_style
	// 		);			
	// 	}).catch((err) => {
	// 		console.log(err)
	// 		toast.error(`${err}`, toast_style);
	// 	})

	// 	// update their page text after submit
	// 	test_query()
	// }

	// call test_query on page load
	// test_query()

</script>

<Toaster />

<h1>Juno FeeShare</h1>


<center>
	<!-- <ul style="width: 20%; list-style: none;">
		<li><a href="https://wetjoe.netlify.app/">Liquid Staking (pupjoes)</a>
		</li>
		<li>
			<a href="github.com/joe-chain/joe">github.com/joe-chain/joe</a>
		</li>
		<li>
			<a href="explorer.justjoe.app">explorer.justjoe.app</a>
		</li>
		<li>
			<a href="https://twitter.com/JustJoeChain">@JustJoeChain</a>
		</li>
		<li>
			<a href="https://justjoe.app/faq.txt">FAQ / INFO</a>
		</li>
		<li>
			<a href="https://sparkibc.s3.filebase.com/JOECOIN%20PROTOCOL.pdf?response-content-disposition=inline&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=CEA302ACE80DC404571A%2F20221120%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20221120T213242Z&X-Amz-Expires=300&X-Amz-SignedHeaders=host&X-Amz-Signature=993be66885776897f9e15e07f187175a760c6bce558b960dd0217da13b412264">JoePaper</a>
		</li>
	</ul> -->

	<!-- <br>	

	<div class="div_center">	
		<h3>Reviews</h3>	
		<ul>
		{#each reviews as review}
			<li style="">
				<Review content={review}></Review>
			</li>
		{/each}
		</ul>
	</div> -->

	<!-- button to call query_contract_info -->
	<button on:click={() => query_contract_info()}>Query Contract Info</button>

	<div id="reviews" class="div_center">
		<!-- <textarea id="contract_addr" name="contract_addr" rows="4" cols="50" placeholder="Enter contract address" bind:value={contract_addr}></textarea> -->
		<br />
		
		<label for="contract_label">Contract Label</label>
		<select id="contract_label" name="contract_label" bind:value={contract_label}>
			<option value="update">Update</option>
			<option value="register">Register</option>
		</select>

		<input type="submit" value="FeeShare Change" on:click={() => feeshare_contract()} />
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
