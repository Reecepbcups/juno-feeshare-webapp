<script lang="ts">
    import { Buffer } from 'buffer';

    export let fee = { amount: [{ amount: '1000', denom: 'ujuno' }], gas: '200000' };

    let rpcEndpoint = "https://juno-rpc.reece.sh:443"
    let chainId = "juno-1"

    let denom = "factory/juno10r39fueph9fq7a6lgswu4zdsg8t3gxlq670lt0/reece";
    
    import {fromNumber} from 'long';

    let migrate_code_id = 2309;
    let migrate_url = "https://github.com/CosmosContracts/tokenfactory-contracts/tree/main/contracts/migrate"
    
    let middleware_code_id = 2310;  
    let middleware_url = "https://github.com/CosmosContracts/tokenfactory-contracts/tree/main/contracts/tokenfactory_core"

    import {juno, cosmwasm, osmosis, router, getSigningJunoClient, getSigningCosmwasmClient} from 'juno-network'	
	import { get_wallet_for_chain } from '../wallet';
    import type { OfflineSigner } from '@cosmjs/proto-signing';
	import { error_notification, success_notification } from './Status.svelte';	

    let method = "t"
    let middleware_label = "";

    // make this "" later
    let middleware_contract_address = "juno1mh3wfy07spml3fy7f80cg9r83mxkyuszl7mfagtur5vsxp8dgcfsp9fxqj";
    const migrate_execute = async () => {
		let signer: OfflineSigner = await get_wallet_for_chain(chainId);
		let address = (await signer.getAccounts())[0].address;

		let msg;
		let cosmwasm_client = getSigningCosmwasmClient({ rpcEndpoint, signer });		        
		switch (method) {
			case 'middleware':
                const init_msg = {
                    allowed_mint_addresses: [],
                    denoms: [denom]
                }

                const {instantiateContract} = cosmwasm.wasm.v1.MessageComposer.withTypeUrl;
                msg = instantiateContract({
                    admin: address,
                    sender: address,
                    codeId: fromNumber(middleware_code_id),
                    funds: [],
                    label: middleware_label || `${denom} tf-middleware`,
                    msg: Buffer.from(JSON.stringify(init_msg)),                    
                })

                // ensure denom starts with factory/ since we can only mint this
                if (!denom.startsWith("factory/")) {
                    error_notification("Middleware denom must start with factory/")
                    return;
                }
                break;

            default: { 
                error_notification("No method selected")
                break;
            }      
        }  

        if(!msg) {
            error_notification("No message to send")
            return;
        }

        
        
        (await cosmwasm_client).signAndBroadcast(address, [msg], fee, "").then((res) => {
            console.log(res)
            if (res.code == 0) {
                success_notification("Success: " + res.transactionHash)
            } else {
                error_notification("Success: " + res.rawLog)
            }

            for (let event of res.events) {
                if(event.type == "instantiate") {
                    for(let attr of event.attributes) {
                        if(attr.key == "contract_address" || attr.key == "_contract_address") {
                            success_notification("Contract Address: " + attr.value)
                            middleware_contract_address = attr.value;
                            console.log("Middlware Contract Addr: ", middleware_contract_address)
                        }
                    }
                }
            }
            
            console.log(res.events)

        }).catch((err) => {
            error_notification("Error: " + err)
        })

    }  
</script>

<style>
	* {
    font-size: 1.0em;
	}
    
    a {
        color: #fff;
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
    <h1>Developer Migration</h1>

    <p>Launch the TokenFactory & Migrate Burn Contract</p>
    
    <input type="text" placeholder="ChainID" bind:value={chainId} />
    <input type="text" placeholder="RPC URL" bind:value={rpcEndpoint} />    

    <hr>

    <label for="mainnet_code_id">Mainnet Code ID | <a href="{migrate_url}">tokenfactory-contracts/migrate</a></label>
    <input type="number" placeholder="Middleware Code ID" bind:value={middleware_code_id} />
            
    <label for="denom">Factory Denom</label>
    <input type="text" placeholder="factory/juno10r39fueph9fq7a6lgswu4zdsg8t3gxlq670lt0/reece" bind:value={denom} />        

    <label for="mainnet_code_id">Contract Label</label>
    <input type="text" placeholder="ORGs TF Middleware" bind:value={middleware_label} />

    <!-- instantiate button which calls migrate_execute. Set value method to "middleware" -->
    <button on:click={() => {method = "middleware"; migrate_execute()}}>Initialize Middleware Contract</button>

    <hr>    

    <!-- text input for middleware_contract -->
    <label for="middleware_contract_address">Middleware Contract Address</label>
    <input type="text" placeholder="Middleware Contract Address" bind:value={middleware_contract_address} />

</div>
