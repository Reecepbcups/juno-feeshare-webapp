
export{
    chains,
};

export type {
    IChain,
}

interface IChain {    
    chainId: string;
    rpcEndpoint: string;
    feeDenom: string;
    middleware_code_id: number;        
    migrate_code_id: number;        
}

interface IChain {
    [key: string]: unknown;
}

const chains = new Map<string, IChain>();
chains.set("juno-1", {
    chainId: "juno-1",
    rpcEndpoint: "https://juno-rpc.reece.sh:443",
    feeDenom: "ujuno",
    middleware_code_id: 2323,
    migrate_code_id: 2324,        
})
chains.set("uni-6", {
    chainId: "uni-6",
    rpcEndpoint: "https://uni-rpc.reece.sh:443",
    feeDenom: "ujunox",
    middleware_code_id: 2874,
    migrate_code_id: 2875,
})
chains.set("custom", {
    chainId: "custom",
    rpcEndpoint: "",
    feeDenom: "",
    middleware_code_id: 0,
    migrate_code_id: 0,
})
