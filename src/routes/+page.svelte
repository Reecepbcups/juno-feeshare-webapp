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
	import IBCAnywhere from '../components/IBCAnywhere.svelte';

	import { page } from '$app/stores';		

	const fee = {amount: [{	amount: "100000",	denom: "ujuno",},], gas: "200000",};
		
	const rpcEndpoint = "https://rpc.juno.strange.love/"			

	const contract_addr_len = 63
	const juno_addr_len = 43
	
	// juno1d7yjapmwerm6qxaxtuyefmcns45x9x6d78gys9uhfsdpkfs4dxfssgw7ap

	let allowed_pages = new Map([
		['tokenfactory', 'TokenFactory'],
		['feeshare', 'FeeShare'],
		['migration', 'Dev Migration'],
		['usermigrate', 'User Migrate'],
		['ibc', 'IBC Transfer'],
	]);

	export let selectedTab = $page.url.searchParams.get('page')?.toLowerCase() || 'feeshare';
	if (selectedTab === null) { 
		selectedTab = 'tokenfactory';
	} else if(!allowed_pages.has(selectedTab)) {
		selectedTab = 'NOT_FOUND';
	}

	const setPageUrl = (page: string) => {
		const url = new URL(window.location.href);
		page = page.toLowerCase();

		if(!allowed_pages.has(page)) {
			selectedTab = 'NOT_FOUND';
		}

		url.searchParams.set('page', page);
		window.history.pushState({}, '', url);
	};


</script>

<SvelteEasyToast />

<div>
	<div class="nav-bar">
		{#each [...allowed_pages] as [page, name]}
			<button class="nav-button {selectedTab === page ? 'selected' : ''}" on:click={() => {
				selectedTab = page

				setPageUrl(page);
			}}>{name}</button>
		{/each}
		
		<button class="nav-button" on:click={() => window.open("https://github.com/reecepbcups/juno-chain-webapp/", "_blank")}>Github</button>
	</div>


	<div class="page">

		<div class="page-container">
			{#if selectedTab === 'tokenfactory'}
				<TokenFactory rpcEndpoint={rpcEndpoint} fee={fee} />
			{:else if selectedTab === 'feeshare'}
				<FeeShare rpcEndpoint={rpcEndpoint} fee={fee} />
			{:else if selectedTab === 'migration'}	
				<Migration />
			{:else if selectedTab === 'usermigrate'}	
				<UserMigration />			
			{:else if selectedTab === 'ibc'}	
				<IBCAnywhere />			
			{:else if selectedTab === 'NOT_FOUND'}
				<br>
				<center>
					<div class="page-container">
						<h1>Page Not Found</h1>
						<p>Sorry, the page you are looking for does not exist.</p>
					</div>
				</center>
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
		/* margin: auto; */
		margin-top: 10px;
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
