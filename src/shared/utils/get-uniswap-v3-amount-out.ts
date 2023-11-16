import { ethers } from "ethers";

export const getUniswapV3AmountOut = async (tokenA, tokenADecimals, tokenB, tokenBDecimals, poolAddress, amountIn, provider) => {
    const wallet =  ethers.Wallet.createRandom();
    const account = wallet.connect(provider);
    const poolContract = new ethers.Contract( // Uniswap v3 ABI
        poolAddress,
        [
            { "inputs": [], "name": "liquidity", "outputs": [ { "internalType": "uint128", "name": "", "type": "uint128" } as any ], "stateMutability": "view", "type": "function" },
            { "inputs": [], "name": "fee", "outputs": [ { "internalType": "uint24", "name": "", "type": "uint24" } as any ], "stateMutability": "view", "type": "function" },
            { "inputs": [], "name": "feeGrowthGlobal0X128", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } as any ], "stateMutability": "view", "type": "function" },
            { "inputs": [], "name": "feeGrowthGlobal1X128", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } as any ], "stateMutability": "view", "type": "function" },
            { "inputs": [], "name": "token0", "outputs": [ { "internalType": "address", "name": "", "type": "address" } as any ], "stateMutability": "view", "type": "function" },
            { "inputs": [], "name": "token1", "outputs": [ { "internalType": "address", "name": "", "type": "address" } as any ], "stateMutability": "view", "type": "function" },
            { "inputs": [], "name": "slot0", "outputs": [ { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" } as any, { "internalType": "int24", "name": "tick", "type": "int24" } as any, { "internalType": "uint16", "name": "observationIndex", "type": "uint16" } as any, { "internalType": "uint16", "name": "observationCardinality", "type": "uint16" } as any, { "internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16" } as any, { "internalType": "uint8", "name": "feeProtocol", "type": "uint8" } as any, { "internalType": "bool", "name": "unlocked", "type": "bool" } as any ], "stateMutability": "view", "type": "function", "constant": true }
       ],
        account);
    const slot0 = await poolContract.slot0();
    const tick = slot0.tick;
    const tickOfPrice = 1.0001 ** tick;
    // prix d'une unité du token 1 en token 0
    const priceInToken1 = (tickOfPrice * (10 ** (tokenADecimals))) / (10 ** tokenBDecimals);
    // prix d'une unité du token 0 en token 1
    // const priceInToken0 = 1 / priceInToken1;
    // si amountIn et en token 0
    const amountOut = amountIn.mul(ethers.utils.parseUnits(priceInToken1.toFixed(18), tokenADecimals)).div(ethers.utils.parseUnits('1', tokenBDecimals));
    return ethers.utils.formatUnits(amountOut.toString(), tokenBDecimals);
};