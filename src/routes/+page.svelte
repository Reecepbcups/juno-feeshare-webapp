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
<div>
<div class="nav-bar">
	<button class="nav-button {selectedTab === 'FeeShare' ? 'selected' : ''}" on:click={() => selectedTab = 'FeeShare'}>FeeShare</button>
	<button class="nav-button {selectedTab === 'TokenFactory' ? 'selected' : ''}" on:click={() => selectedTab = 'TokenFactory'}>TokenFactory</button>
	<button class="nav-button {selectedTab === 'Migration' ? 'selected' : ''}" on:click={() => selectedTab = 'Migration'}>Dev Migration</button>
	<button class="nav-button {selectedTab === 'UserMigrate' ? 'selected' : ''}" on:click={() => selectedTab = 'UserMigrate'}>User Migrate</button>

	<!-- a button which is a link to github -->
	<button class="nav-button" on:click={() => window.open("https://github.com/reecepbcups/juno-chain-webapp/", "_blank")}>Github</button>
</div>
<div class="page">
<!-- <a href="https://github.com/Reecepbcups/juno-chain-webapp">https://github.com/Reecepbcups/juno-chain-webapp</a> -->
<div class="page-container">
{#if selectedTab === 'FeeShare'}
	<FeeShare rpcEndpoint={rpcEndpoint} fee={fee} />
{:else if selectedTab === 'TokenFactory'}
	<TokenFactory rpcEndpoint={rpcEndpoint} fee={fee} />
{:else if selectedTab === 'Migration'}	
	<Migration />
{:else if selectedTab === 'UserMigrate'}	
	<UserMigration />
{/if}
</div>
</div>
</div>


<style>
	.page {
		padding-top: 30px;
		width: 100%;
		margin: auto;
		display: grid;
		position: relative;
	}

	.nav-bar {
		padding-top: 50px;
		left: 0px;
		grid-template-columns: 20% 20% 20% 20% 20%;
		display: grid;
		width: 100%;
	}

	.page-container {
		width: 100%;
		margin: auto;
	}

	.nav-button {
		border: none;
		border-radius: 8px;
		background-color: #555;
		color: #f5f5f5;
		cursor: pointer;
		font-size: 0.7rem;
		width: 80%;
		margin: auto;
	}

	@media (min-width:780px){
		.nav-button {
			border: none;
			border-radius: 8px;
			background-color: #555;
			color: #f5f5f5;
			cursor: pointer;
			font-size: 1.1rem;
			width: 80%;
			margin: auto;
		}
	}

	.nav-button.selected {
		background-color: #f5f5f5;
		color: #222;
	}
</style>
