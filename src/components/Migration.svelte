<script lang="ts">
    import { Buffer } from 'buffer';        

    import {chains, type IChain} from '../scripts/chains';

   let selectedChain: IChain | undefined = chains.get("juno-1");
    
    let migrate_code_id = 0;
    let middleware_code_id = 0;
    $: if(selectedChain) {
        migrate_code_id = selectedChain.migrate_code_id;
        middleware_code_id = selectedChain.middleware_code_id;
    }


    let denom = "factory/juno10r39fueph9fq7a6lgswu4zdsg8t3gxlq670lt0/js-denom";
    
    import {fromNumber} from 'long';
    
    let middleware_url = "https://github.com/CosmosContracts/tokenfactory-contracts/tree/main/contracts/tokenfactory_core"
    let migrate_url = "https://github.com/CosmosContracts/tokenfactory-contracts/tree/main/contracts/migrate"    

    import {juno, cosmwasm, osmosis, router, getSigningJunoClient, getSigningOsmosisClient, getSigningCosmwasmClient} from 'juno-network'	
	import { get_wallet_for_chain } from '../wallet';
    import type { OfflineSigner } from '@cosmjs/proto-signing';
	import { error_notification, success_notification } from './Status.svelte';	

    let method = "t"
    let middleware_label = "";

    // make this "" later
    let middleware_contract_address = "juno12gvt30u3qsvj4lpdesy5afuz67l5tyyzfu09fe5956rxvgtvykjqdntykz";    
    let migrate_contract_address = ""; // juno129hwc89t2dauw4czpqv9jrfurlpmu8rufnzpejwkl78sx0xy9apqnjsl2e

    const migrate_execute = async () => {

        // if selectedChain is undefined, return
        if(!selectedChain) {
            error_notification("Chain not selected")
            return;
        }

		let signer: OfflineSigner = await get_wallet_for_chain(selectedChain.chainId);
		let address = (await signer.getAccounts())[0].address;

		let msg;

        const { changeAdmin } = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
        const {instantiateContract, executeContract} = cosmwasm.wasm.v1.MessageComposer.withTypeUrl;

        let fee = { amount: [{ amount: '1000', denom: selectedChain.feeDenom }], gas: '200000' };
				        			        
		switch (method) {
			case 'middleware':
                alert(`Launching this contract gets it ready to mint ${denom}. You can do this before you have the denomination, but you WILL need to be admin for the next steps`);

                const init_msg = {
                    allowed_mint_addresses: [],
                    denoms: [denom]
                }            
                msg = instantiateContract({
                    admin: address,
                    sender: address,
                    codeId: fromNumber(selectedChain.middleware_code_id),
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

            case 'reclaim_admin':    
                // https://github.com/CosmosContracts/tokenfactory-contracts/blob/main/packages/tokenfactory-types/src/msg.rs
                msg = executeContract({
                    sender: address,
                    contract: middleware_contract_address,
                    funds: [],
                    msg: Buffer.from(JSON.stringify({
                        transfer_admin: { new_address: address, denom: denom}
                    }))
                })
                
                if (!denom.startsWith("factory/")) {
                    error_notification("Middleware denom must start with factory/")
                    return;
                }

                alert("Reclaiming admin will take back the denomination from the Middleware Contract Minter, to your account.")

				break;


            case 'add_whitelist':    
                // https://github.com/CosmosContracts/tokenfactory-contracts/blob/main/packages/tokenfactory-types/src/msg.rs
                msg = executeContract({
                    sender: address,
                    contract: middleware_contract_address,
                    funds: [],
                    msg: Buffer.from(JSON.stringify({
                        // allows the migrate contract address to mint tokens through the middleware
                        add_whitelist: { addresses: [migrate_contract_address] }
                    }))
                })   
                                
                if (migrate_contract_address.length == 0) {
                    error_notification("Migrate contract address must be set")
                    return;
                }
				break;
            case 'remove_whitelist':    
                // https://github.com/CosmosContracts/tokenfactory-contracts/blob/main/packages/tokenfactory-types/src/msg.rs
                msg = executeContract({
                    sender: address,
                    contract: middleware_contract_address,
                    funds: [],
                    msg: Buffer.from(JSON.stringify({
                        // allows the migrate contract address to mint tokens through the middleware
                        add_whitelist: { addresses: [migrate_contract_address] }
                    }))
                })   
                                
                if (migrate_contract_address.length == 0) {
                    error_notification("Migrate contract address must be set")
                    return;
                }
				break;
                
            case 'migrate_contract':
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
                    codeId: fromNumber(selectedChain.migrate_code_id),
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
        
        let rpcEndpoint = selectedChain.rpcEndpoint;

        if(method == "middleware") {
            let cosmwasm_client = getSigningCosmwasmClient({ rpcEndpoint, signer });
            (await cosmwasm_client).signAndBroadcast(address, [msg], fee, "").then((res) => {
                console.log(res)
                if (res.code == 0) {
                    success_notification("Success: " + res.transactionHash)
                } else {
                    error_notification("Success: " + res.rawLog)
                }
                
                middleware_contract_address = get_contract_address(res.events);
                if(middleware_contract_address.length == 0) {
                    error_notification("No contract address found in events")
                    return;
                }

                console.log("Middlware Contract Addr: ", middleware_contract_address)
                success_notification("Middleware Contract Address: " + middleware_contract_address)

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
                     
                
                migrate_contract_address = get_contract_address(res.events);

                console.log(res.events)
                if(migrate_contract_address.length == 0) {
                    error_notification("No contract address found in events")
                    return;
                }

                success_notification("Migrate Contract Address: " + migrate_contract_address)                
                console.log("Migrate Contract Addr: ", migrate_contract_address)                
            }).catch((err) => {
                error_notification("Error: " + err)
            })

        } else if (method == "reclaim_admin" || method == "add_whitelist" || method == "remove_whitelist") {
            let cosmwasm_client = getSigningCosmwasmClient({ rpcEndpoint, signer });
            (await cosmwasm_client).signAndBroadcast(address, [msg], fee, "").then((res) => {
                console.log(res)
                if (res.code == 0) {
                    success_notification("Success: " + res.transactionHash)
                } else {
                    error_notification("Success: " + res.rawLog)
                }             
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

    const get_contract_address = (events: any): string => {
        for (let event of events) {
            if(event.type == "instantiate") {
                for(let attr of event.attributes) {
                    if(attr.key == "contract_address" || attr.key == "_contract_address") {
                        return attr.value; // the contract address
                    }
                }
            }
        }   
        return ""; 
    }

    let middleware_allowed_minters: string[] = [];
    const get_middleware_config = async () => {
        if (!selectedChain) {
            error_notification("Chain not selected")
            return;
        }

        let rpcEndpoint = selectedChain.rpcEndpoint;
        let cosmwasm_query = cosmwasm.ClientFactory.createRPCQueryClient({rpcEndpoint});

        let query_req = Buffer.from(JSON.stringify({get_config:{}}));

        (await cosmwasm_query).cosmwasm.wasm.v1.smartContractState({address: middleware_contract_address, queryData: query_req}).then((res) => {
            let json = JSON.parse(new TextDecoder().decode(res.data));
            console.log('get_config', json)
            
            // https://github.com/CosmosContracts/tokenfactory-contracts/blob/main/contracts/migrate/src/contract.rs#L175            
            middleware_allowed_minters = json.allowed_minters;

        }).catch((err) => {
            error_notification("Error: " + err)
            console.log(err)
        })

    }


    let contract_has_admin = false;
    const query_admin = async () => {
        if (!selectedChain) {
            error_notification("Chain not selected")
            return;
        }

        let rpcEndpoint = selectedChain.rpcEndpoint;        
        let osmosis_query = osmosis.ClientFactory.createRPCQueryClient({rpcEndpoint});

        (await osmosis_query).osmosis.tokenfactory.v1beta1.denomAuthorityMetadata({denom: denom}).then((res) => {
            console.log(res)

            let admin = res.authorityMetadata?.admin
            
            if(admin == middleware_contract_address) {
                contract_has_admin = true;
                success_notification(`Success: Contract has admin`)
            } else {
                contract_has_admin = false;
                error_notification(`Contract does not have admin: ${admin}`)
            }
        })
    }

    // let middleware_denom = ""
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

    let burn_type = 'cw20';
    let cw20_burn_address = ""; // RAW: juno15u3dt79t6sxxa3x3kpkhzsy56edaa5a66wvt3kxmukqjz2sx0hes5sn38g
    let native_burn_denom = "";
    const query_cw20_ensure = async () => {
        if (!selectedChain) {
            error_notification("Chain not selected")
            return;
        }
        
        let rpcEndpoint = selectedChain.rpcEndpoint;
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

    .container-div {
        display: grid;
        grid-template-columns: 100%;
        row-gap: 20px;
        margin-bottom: 50px;
    }

    @media (min-width:780px){
        .container-div {
            display: grid;
            grid-template-columns: 50% 50%;
        }
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
        box-shadow: 15px 20px 30px #444444;
        border: 1px solid #000;
	}

	input[type="text"], input[type="number"] {
		margin: 2px;
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
		margin: 2px;
		padding: 8px;
		border: none;
		border-radius: 8px;
		background-color: #222;
		color: #fff;
		font-size: 16px;
		width: 100%;
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

    label {        
        margin-top: 10px;

        /* put on the left of the flex */
        align-self: flex-start;
    }
</style>

<div class="container-div">
<div class="container">
    <h2 class="flex-box">Middleware Contract (Part 1)</h2>

    <!-- show a drop down selector for chains -->
    <label for="chain">Chain</label>
    <select bind:value={selectedChain}>
        {#each Array.from(chains.values()) as chain}
            <option value={chain}>{chain.chainId}</option>
        {/each}
    </select>

    <!-- when chain is selected, update the following inputs -->
    {#if selectedChain}
        {#each Object.keys(selectedChain) as key}
            {#if key != "migrate_code_id"}   

                {#if key == "middleware_code_id"}
                    <label for="mainnet_code_id">Core Code ID | <a href="{middleware_url}">tokenfactory-contracts/tokenfactory-core</a></label>
                    <input type="number" placeholder="Middleware Code ID" bind:value={selectedChain[key]} />
                {:else}
                    <label for={key}>{key}</label>
                    <input type="text" placeholder={key} bind:value={selectedChain[key]} />
                {/if}

            {/if}
        {/each}
    {/if}    
    
    <!-- <input type="text" placeholder="ChainID" bind:value={chainId} />
    <input type="text" placeholder="RPC URL" bind:value={rpcEndpoint} />     -->

    <hr>

    Setup an admin contract to mint tokens


            
    <label for="denom">Initial Factory Denom</label>        
    <input type="text" placeholder="factory/.../..." bind:value={denom} />        

    <label for="mainnet_code_id">Label</label>
    <input type="text" placeholder="ORGs TF Middleware" bind:value={middleware_label} />

    <!-- instantiate button which calls migrate_execute. Set value method to "middleware" -->
    <button on:click={() => {method = "middleware"; migrate_execute()}}>Setup Middleware Contract</button>    

    <hr>    

    <!-- text input for middleware_contract -->
    <label for="middleware_contract_address">Middleware Contract Address</label>
    <input type="text" placeholder="Middleware Contract Address" bind:value={middleware_contract_address} />

    <!-- move tokenfactory admin to contract -->    
    <button on:click={() => {method = "transfer_admin"; migrate_execute()}}>Transfer TF Admin To Contract</button>

    <button on:click={() => {query_admin()}}>Ensure contract has admin check</button>
    <hr>

    <!-- a button which transfers admin back from the contract -->
    <button on:click={() => {method = "reclaim_admin"; migrate_execute()}} style="background-color:#ff6666;">Reclaim Admin from Middleware Contract</button>
    
</div>

<div class="container">
    <h2 class="flex-box">Migrate/Burn Contract (Part 2)</h2>

    <!-- an update of selected chain, update migrate code id -->
    {#if selectedChain} 
        <label for="migrate_code_id">Migrate Code ID | <a href="{middleware_url}">tokenfactory-contracts/migrate</a></label>
        <input type="number" placeholder="CW20 / Native burn Migrate Code ID" bind:value={selectedChain.migrate_code_id} />
    {/if}


    <!-- I don't think we need this here, maybe a text box here -->
    <!-- <button on:click={query_denoms_from_middleware_contract}>Get Denoms</button>    
    {#if middleware_denom.length == 0}
        <p>Denom not found</p>
    {:else}
        <p>{middleware_denom}</p>
    {/if} -->

    <!-- radio buttons, CW20 and Native -->
    <label for="burn_type">Denom To Burn</label>
    <select bind:value={burn_type}>
        <option value="cw20" selected>CW20 Contract Address</option>
        <option value="native">Native (ujuno, ibc, factory, etc)</option>
    </select>

    <!-- if burn_type is cw20, text for address -->
    {#if burn_type == "cw20"}
        <label for="burn_address">CW20 Burn Address</label>        
        <input type="text" placeholder="Burn Address" bind:value={cw20_burn_address} />    
        <!-- <button on:click={query_cw20_ensure}>query_cw20_ensure</button> -->

        <!-- if length of cw20_burn_address == 52, call query_cw20_ensure without input -->
        {#if cw20_burn_address.length == 63}
            {#await query_cw20_ensure()}
                <!-- <p>Querying CW20 Burn Address</p>             -->
            {/await}
        {/if}


    {:else if burn_type == "native"}
        <label for="burn_address">Native Burn Denom</label>        
        <input type="text" placeholder="( ujuno, ibc/..., or factory/ )" bind:value={native_burn_denom} />            
    {/if}

    <br>
    <hr>

    <button on:click={() => {method = "migrate_contract"; migrate_execute()}}>Initialize Migrate Contract</button>

    <br>

   
    <label for="migrate_contract_address">Migrate Contract Address:</label>
    <p>Give this address to users to use in the Burn section of this app.</p>
    <input type="text" placeholder="Migrate Contract Address" bind:value={migrate_contract_address} />

    <button on:click={() => {method = "add_whitelist"; migrate_execute()}}>Allow Migrate to mint TF Denom</button>
    <!-- remove whitelist button future too -->

    <hr>    
</div>
</div>