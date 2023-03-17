<!-- 
    Reece Williams | march 2023 | Juno Modules
-->
<script lang="ts">
	import { SvelteEasyToast } from 'svelte-easy-toast';

	import '../components/FeeShare.svelte';
	import '../components/TokenFactory.svelte';
	import '../components/Migration.svelte';

	import FeeShare from '../components/FeeShare.svelte';
	import TokenFactory from '../components/TokenFactory.svelte';
	import Migration from '../components/Migration.svelte';
	import UserMigration from '../components/UserMigration.svelte';

	const fee = {amount: [{	amount: "100000",	denom: "ujuno",},], gas: "200000",};
		
	const rpcEndpoint = "https://rpc.juno.strange.love/"			

	const contract_addr_len = 63
	const juno_addr_len = 43
	
	// juno1d7yjapmwerm6qxaxtuyefmcns45x9x6d78gys9uhfsdpkfs4dxfssgw7ap

	export let selectedTab = 'FeeShare';	
</script>

<!-- <Toaster /> -->
<SvelteEasyToast />


<div class="nav-bar">
	<button class="nav-button {selectedTab === 'FeeShare' ? 'selected' : ''}" on:click={() => selectedTab = 'FeeShare'}>FeeShare</button>
	<button class="nav-button {selectedTab === 'TokenFactory' ? 'selected' : ''}" on:click={() => selectedTab = 'TokenFactory'}>TokenFactory</button>		
	<button class="nav-button {selectedTab === 'Migration' ? 'selected' : ''}" on:click={() => selectedTab = 'Migration'}>Dev Migration</button>		
	<button class="nav-button {selectedTab === 'UserMigrate' ? 'selected' : ''}" on:click={() => selectedTab = 'UserMigrate'}>User Migrate</button>		

	<!-- a button which is a link to github -->
	<button class="nav-button" on:click={() => window.open("https://github.com/reecepbcups/juno-chain-webapp/", "_blank")}>Github</button>
</div>

<!-- <a href="https://github.com/Reecepbcups/juno-chain-webapp">https://github.com/Reecepbcups/juno-chain-webapp</a> -->

{#if selectedTab === 'FeeShare'}
	<FeeShare rpcEndpoint={rpcEndpoint} fee={fee} />
{:else if selectedTab === 'TokenFactory'}
	<TokenFactory rpcEndpoint={rpcEndpoint} fee={fee} />
{:else if selectedTab === 'Migration'}	
	<Migration />
{:else if selectedTab === 'UserMigrate'}	
	<UserMigration />
{/if}
	


<style>
	.nav-bar {
		align-self: flex-start;
		/* background-color: #444; */
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 15%;
		margin-right: 40%;
		height: 100%;
		padding: 20px;
	}

	.nav-button {
		margin: 20% 1%;
		padding: 8px 16px;
		border: none;
		border-radius: 8px;
		background-color: #555;
		color: #f5f5f5;		
		cursor: pointer;
		width: 100%;
		height: 4%;
		font-size: 1.1rem;
	}

	.nav-button.selected {
		background-color: #f5f5f5;
		color: #222;
	}
</style>
