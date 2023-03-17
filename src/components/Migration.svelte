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

    import {juno, cosmwasm, osmosis, router, getSigningJunoClient, getSigningOsmosisClient, getSigningCosmwasmClient} from 'juno-network'	
	import { get_wallet_for_chain } from '../wallet';
    import type { OfflineSigner } from '@cosmjs/proto-signing';
	import { error_notification, success_notification } from './Status.svelte';	

    let method = "t"
    let middleware_label = "";

    // make this "" later
    let middleware_contract_address = "juno1mh3wfy07spml3fy7f80cg9r83mxkyuszl7mfagtur5vsxp8dgcfsp9fxqj";    
    let migrate_contract_address = "";
    const migrate_execute = async () => {
		let signer: OfflineSigner = await get_wallet_for_chain(chainId);
		let address = (await signer.getAccounts())[0].address;

		let msg;

        const { changeAdmin } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
        const {instantiateContract} = cosmwasm.wasm.v1.MessageComposer.withTypeUrl;
				        			        
		switch (method) {
			case 'middleware':
                const init_msg = {
                    allowed_mint_addresses: [],
                    denoms: [denom]
                }            
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

            case 'transfer_admin':                
				msg = changeAdmin({
					sender: address,
					denom: denom,
					newAdmin: middleware_contract_address
				});

				if (denom.length == 0) {
					error_notification('Denom cannot be empty');
					return;
				}
				break;
                
            case 'migrate_contract':
            // let cw20_burn_address = "";
            // let native_burn_denom = "";

                interface IMigrateInitMsg {
                    tf_denom: string,
                    contract_minter_address: string,
                    cw20_token_address?: string, // one or the other
                    burn_denom?: string, // native
                }

                const migrate_init_msg: IMigrateInitMsg = {
                    tf_denom: denom,
                    contract_minter_address: middleware_contract_address,
                }

                if(cw20_burn_address.length != 0) {
                    migrate_init_msg['cw20_token_address'] = cw20_burn_address;
                }

                if(native_burn_denom.length != 0) {
                    migrate_init_msg['burn_denom'] = native_burn_denom;
                }
                                
                msg = instantiateContract({
                    admin: address,
                    sender: address,
                    codeId: fromNumber(migrate_code_id),
                    funds: [],
                    label: middleware_label || `${denom} tf-middleware`,
                    msg: Buffer.from(JSON.stringify(migrate_init_msg)),                    
                })
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
        
        if(method == "middleware") {
            let cosmwasm_client = getSigningCosmwasmClient({ rpcEndpoint, signer });
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

        } else if (method == "migrate_contract") {
            let cosmwasm_client = getSigningCosmwasmClient({ rpcEndpoint, signer });
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
                                success_notification("Migrate Contract Address: " + attr.value)
                                migrate_contract_address = attr.value;
                                console.log("Migrate Contract Addr: ", migrate_contract_address)
                            }
                        }
                    }
                }            
                console.log(res.events)
            }).catch((err) => {
                error_notification("Error: " + err)
            })

        } else if (method == "transfer_admin") {
            let osmosis_client = getSigningOsmosisClient({ rpcEndpoint, signer });	

            (await osmosis_client).signAndBroadcast(address, [msg], fee, "").then((res) => {
                console.log(res)
                if (res.code == 0) {
                    success_notification("Success: " + res.transactionHash)
                } else {
                    error_notification("Error: " + res.rawLog)
                }
            }).catch((err) => {
                error_notification("Error: " + err)
            })
        }        
    }  


    let contract_has_admin = false;
    const query_admin = async () => {
        let osmosis_query = osmosis.ClientFactory.createRPCQueryClient({rpcEndpoint});

        (await osmosis_query).osmosis.tokenfactory.v1beta1.denomAuthorityMetadata({denom: denom}).then((res) => {
            console.log(res)
            
            if(res.authorityMetadata?.admin == middleware_contract_address) {
                contract_has_admin = true;
                success_notification("Success: Contract has admin")
            } else {
                contract_has_admin = false;
                error_notification("Contract does not have admin")
            }
        })
    }

    let middleware_denom = ""
    const query_denoms_from_middleware_contract = async () => {
        let cosmwasm_query = cosmwasm.ClientFactory.createRPCQueryClient({rpcEndpoint});
        const query_req = Buffer.from(JSON.stringify({get_config:{}}));                
        (await cosmwasm_query).cosmwasm.wasm.v1.smartContractState({address: middleware_contract_address, queryData: query_req}).then((res) => {            
            let json = JSON.parse(new TextDecoder().decode(res.data));
            console.log('get_denoms', json)
            if(json.denoms) {
                success_notification("Success, Denom Found: " + json.denoms)
            } else {
                error_notification("Error: " + json)
            }
            middleware_denom = json.denoms[0]
        })
    }

    let burn_type = 'cw20';
    let cw20_burn_address = "";
    let native_burn_denom = "";
    const query_cw20_ensure = async () => {
        let cosmwasm_query = cosmwasm.ClientFactory.createRPCQueryClient({rpcEndpoint});

        // in the base CW20
        // https://github.com/CosmWasm/cw-plus/blob/main/contracts/cw20-base/src/msg.rs#LL81C5-L81C14
        const query_req = Buffer.from(JSON.stringify({token_info:{}}));

        (await cosmwasm_query).cosmwasm.wasm.v1.smartContractState({address: cw20_burn_address, queryData: query_req}).then((res) => {            
            try {
                let json = JSON.parse(new TextDecoder().decode(res.data));
                console.log('get_denoms', json)
                success_notification("Success, CW20 Found: " + json.name)
            } catch (error) {
                error_notification("Error: not a CW20 (token_info:{})")
            }    
        }).catch((err) => {
            error_notification("Error: " + "not a CW20 (no 'token_info:{}'')")
            console.log(err)
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

    <label for="mainnet_code_id">Migrate Code ID | <a href="{migrate_url}">tokenfactory-contracts/tokenfactory-core</a></label>
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

    <!-- move tokenfactory admin to contract -->    
    <button on:click={() => {method = "transfer_admin"; migrate_execute()}}>Transfer Admin To Contract</button>

    
    <button on:click={() => {query_admin()}}>Query admin and ensure success</button>

    <br>
    <hr>
    <hr>
    <hr>

    <label for="migrate_code_id">Migrate Code ID | <a href="{middleware_url}">tokenfactory-contracts/migrate</a></label>
    <input type="number" placeholder="CW20 / Native burn Migrate Code ID" bind:value={migrate_code_id} />

    <!-- I don't think we need this here, maybe a text box here -->
    <!-- <button on:click={query_denoms_from_middleware_contract}>Get Denoms</button>    
    {#if middleware_denom.length == 0}
        <p>Denom not found</p>
    {:else}
        <p>{middleware_denom}</p>
    {/if} -->

    <!-- radio buttons, CW20 and Native -->
    <label for="burn_type">Burn Denom</label>
    <select bind:value={burn_type}>
        <option value="cw20" selected>CW20 Contract Address</option>
        <option value="native">Native (ujuno, ibc, factory, etc)</option>
    </select>

    <!-- if burn_type is cw20, text for address -->
    {#if burn_type == "cw20"}
        <label for="burn_address">CW20 Burn Address</label>        
        <input type="text" placeholder="Burn Address" bind:value={cw20_burn_address} />    
        <button on:click={query_cw20_ensure}>query_cw20_ensure</button>

    {:else if burn_type == "native"}
        <label for="burn_address">Native Burn Denom</label>        
        <input type="text" placeholder="( ujuno, ibc/..., or factory/ )" bind:value={native_burn_denom} />            
    {/if}

    <br>
    <hr>

    <button on:click={() => {method = "migrate_contract"; migrate_execute()}}>Initialize Migrate Contract</button>

    <br>

    {#if migrate_contract_address.length != 0}
        <label for="migrate_contract_address">Migrate Contract Address:</label>
        <p>Give this address to users to use in the Burn section of this app.</p>
        <input type="text" placeholder="Migrate Contract Address" bind:value={migrate_contract_address} />
    {/if}

</div>
