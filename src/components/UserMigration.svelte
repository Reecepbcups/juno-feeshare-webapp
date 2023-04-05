<script lang="ts">
    import { Buffer } from 'buffer';
    // import {fromNumber} from 'long';

    import { page } from '$app/stores';	
    export let chainId = $page.url.searchParams.get('chain_id')?.toLowerCase() || 'juno-1';
    export let rpcEndpoint = $page.url.searchParams.get('rpc')?.toLowerCase() || 'https://juno-rpc.reece.sh:443';

    // the address they want to interact with, deposit & burn in exchange for the new token
    export let migrate_contract_address = $page.url.searchParams.get('contract')?.toLowerCase() || 'juno1d5pkl438ugaufhafx9pzy3dw4rlfdt7sfldja7ydvzkxnj5etgpqxjjryz';    

    let fee = { amount: [{ amount: '1000', denom: 'ujuno' }], gas: '400000' };     

    import {cosmwasm, getSigningCosmwasmClient} from 'juno-network'	
	import { get_wallet_for_chain } from '../wallet';
    import type { OfflineSigner } from '@cosmjs/proto-signing';
	import { error_notification, success_notification } from './Status.svelte';	


    // const query_denoms_from_middleware_contract = async () => {
    //     let cosmwasm_query = cosmwasm.ClientFactory.createRPCQueryClient({rpcEndpoint});
    //     const query_req = Buffer.from(JSON.stringify({get_config:{}}));                
    //     (await cosmwasm_query).cosmwasm.wasm.v1.smartContractState({address: middleware_contract_address, queryData: query_req}).then((res) => {            
    //         let json = JSON.parse(new TextDecoder().decode(res.data));
    //         console.log('get_denoms', json)
    //         if(json.denoms) {
    //             success_notification("Success, Denom Found: " + json.denoms)
    //         } else {
    //             error_notification("Error: " + json)
    //         }
    //         middleware_denom = json.denoms[0]
    //     })
    // }
    
    let accepted_denom = "" // if it starts with juno1, its a cw20. Else, native
    let is_cw20 = accepted_denom.startsWith("juno1")

    let receiving_tf_denom = ""    

    const get_migrate_config = async () => {
        let cosmwasm_query = cosmwasm.ClientFactory.createRPCQueryClient({rpcEndpoint});

        let query_req = Buffer.from(JSON.stringify({get_config:{}}));

        (await cosmwasm_query).cosmwasm.wasm.v1.smartContractState({address: migrate_contract_address, queryData: query_req}).then((res) => {
            let json = JSON.parse(new TextDecoder().decode(res.data));
            console.log('get_config', json)
            
            // https://github.com/CosmosContracts/tokenfactory-contracts/blob/main/contracts/migrate/src/contract.rs#L175

            receiving_tf_denom = json.tf_denom;
            // let contract_minter_address = json.contract_minter_address;

            // only 1 can be set at a time. Option<String>
            if(json.burn_denom) {
                accepted_denom = json.burn_denom; // native token if applicable
                is_cw20 = false;
                method = "native_burn";
            } else {
                accepted_denom = json.cw20_token_address; // cw20 token address if applicable
                is_cw20 = true;
                method = "cw20_burn";
            }
        }).catch((err) => {
            error_notification("Error: " + err)
            console.log(err)
        })

    }
    
    // let cw20_burn_address = "";
    // let native_burn_denom = "";
    // const query_cw20_ensure = async () => {
    //     let cosmwasm_query = cosmwasm.ClientFactory.createRPCQueryClient({rpcEndpoint});

    //     // in the base CW20
    //     // https://github.com/CosmWasm/cw-plus/blob/main/contracts/cw20-base/src/msg.rs#LL81C5-L81C14
    //     const query_req = Buffer.from(JSON.stringify({token_info:{}}));

    //     (await cosmwasm_query).cosmwasm.wasm.v1.smartContractState({address: cw20_burn_address, queryData: query_req}).then((res) => {            
    //         try {
    //             let json = JSON.parse(new TextDecoder().decode(res.data));
    //             console.log('get_denoms', json)
    //             success_notification("Success, CW20 Found: " + json.name)
    //         } catch (error) {
    //             error_notification("Error: not a CW20 (token_info:{})")
    //         }    
    //     }).catch((err) => {
    //         error_notification("Error: " + "not a CW20 (no 'token_info:{}'')")
    //         console.log(err)
    //     })
    // }
    
    const {executeContract} = cosmwasm.wasm.v1.MessageComposer.withTypeUrl;

    
    let method = "";
    let burn_amount = 0;
    const user_migrate_execute = async (
        method: string
    ) => {
		let signer: OfflineSigner = await get_wallet_for_chain(chainId);
		let address = (await signer.getAccounts())[0].address;

		let msg;
		let cosmwasm_client = getSigningCosmwasmClient({rpcEndpoint, signer})

		switch (method) {
			case 'native_burn':
				msg = executeContract({
                    sender: address,
                    contract: migrate_contract_address,
                    funds: [{amount: burn_amount.toString(), denom: accepted_denom}],
                    msg: Buffer.from(JSON.stringify({
                        convert: {}
                    }))
                })

				if (burn_amount <= 0) {
					error_notification(`burn_amount must be greater than 0`);
					return;
				}
				break;

			case 'cw20_burn':
                // go through the CW20 contract, then call a burn message to the migrate contract address BLEH
                let encoded_msg = Buffer.from(JSON.stringify({
                    convert: {}
                })).toString('base64')
				msg = executeContract({
                    sender: address,
                    contract: accepted_denom,
                    funds: [],
                    msg: Buffer.from(JSON.stringify({
                        send: {
                            contract: migrate_contract_address,
                            amount: burn_amount.toString(),
                            msg: encoded_msg // does msg have to be encoded here? or does it auto do for me?
                        }
                    }))
                })

				if (burn_amount <= 0) {
					error_notification(`burn_amount must be greater than 0`);
					return;
				}

				if (!accepted_denom.startsWith("juno1")) {
					error_notification(`accepted_denom must be a CW20 token address and start with juno1...`);
					return;
				}


				break;
            default:
                error_notification('Method not found');
                return;
        }      
        
        if(!msg) {
            error_notification('Message not found');
            return;
        }

        (await cosmwasm_client).signAndBroadcast(address, [msg], fee, "").then((res) => {            
            if (res.code == 0 && !res.rawLog?.toLowerCase().includes("failed")) {
                success_notification("Success: " + res.transactionHash)
            } else {
                error_notification("Error: " + res.rawLog)
            }
        }).catch((err) => {
            error_notification("Error: " + err)
            console.log(err)
        })

    }

    //  TODO: allow for them to copy paste the URL easily to give to others
    const getUrlFormat = (): string => {
        let host = window.location.host;

        // get base website url root
        let updated_url = `${host}/?page=usermigrate&chain_id=${chainId}&rpc=${rpcEndpoint}&contract=${migrate_contract_address}`;


        // http://localhost:6010/?page=usermigrate&chain_id=juno-1&rpc=https://rpc.juno.strange.love&contract=juno1d5pkl438ugaufhafx9pzy3dw4rlfdt7sfldja7ydvzkxnj5etgpqxjjryz
        

        console.log(updated_url)

        return updated_url;
    }    

</script>

<style>
	* {
        font-size: 1.0em;                    
	}
    
    a {
        color: #fff;
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

	input[type="text"], input[type="number"] {
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

    label {        
        margin-top: 20px;

        /* put on the left of the flex */
        align-self: flex-start;
    }
</style>


<div class="container">    
    <h2 class="flex-box">User Migrate</h2>
    
    <label for="chain_id">Chain ID</label>
    <input type="text" placeholder="ChainID" bind:value={chainId} />

    <label for="rpc_url">RPC URL</label>
    <input type="text" placeholder="RPC URL" bind:value={rpcEndpoint} />


    <label for="migrate_contract">Migrate Contract</label>
    <input type="text" placeholder="juno1..." bind:value={migrate_contract_address} />
    
    <!-- <p>{getUrlFormat()}</p> -->

    <!-- button to query this address -->
    <button on:click={get_migrate_config}>Query Migrate Contract</button>

    <!-- if accepted_denom != "", show it here -->
    {#if receiving_tf_denom != ""}
        <!-- receiving denom -->
        <label for="denom">Receiving Denom</label>
        <p>{receiving_tf_denom}</p>       
    {/if}

    {#if accepted_denom != ""}
        <!-- if accepted_denom starts with juno1, it requires a cw20 deposit -->
        {#if is_cw20}
            <label for="cw20">CW20 Address</label>            
        {:else}
            <label for="native_deposit">Native Deposit of token</label>
        {/if}
        {accepted_denom}

        <!-- We should query instead and allow them to burn all, set max. Query balance -->
        <label for="burn_amount">Burning {burn_amount} {accepted_denom}</label>
        <input type="number" placeholder="Burn Amount" bind:value={burn_amount} />
        <p>for {burn_amount} {receiving_tf_denom}</p>



        <button on:click={() => {user_migrate_execute(method)}}>Migrate Tokens</button>

    {/if}



    <!-- <hr>

    <label for="mainnet_code_id">Migrate Code ID | <a href="{migrate_url}">tokenfactory-contracts/tokenfactory-core</a></label>
    <input type="number" placeholder="Middleware Code ID" bind:value={middleware_code_id} />
            
    <label for="denom">Factory Denom</label>        
    <input type="text" placeholder="factory/juno10r39fueph9fq7a6lgswu4zdsg8t3gxlq670lt0/reece" bind:value={denom} />        

    <label for="mainnet_code_id">Contract Label</label>
    <input type="text" placeholder="ORGs TF Middleware" bind:value={middleware_label} />

    
    <button on:click={() => {method = "middleware"; migrate_execute()}}>Initialize Middleware Contract</button>

    <hr>    

    <label for="middleware_contract_address">Middleware Contract Address</label>
    <input type="text" placeholder="Middleware Contract Address" bind:value={middleware_contract_address} />
 
    <button on:click={() => {method = "transfer_admin"; migrate_execute()}}>Transfer TokenFactory Admin To Contract</button>

    <button on:click={() => {query_admin()}}>Query admin and ensure success</button>
    <hr>

    <button on:click={() => {method = "reclaim_admin"; migrate_execute()}}>Reclaim Admin from Middleware Contract</button> -->
    
</div>