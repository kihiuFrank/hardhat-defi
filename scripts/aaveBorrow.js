/* eslint-disable no-process-exit */
// yarn hardhat node
// yarn hardhat run scripts/aaveBorrow.js --network localhost
const { ethers, getNamedAccounts } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth")

async function main() {
    //protocol treats everything as ERC20 token but ETH is not an ERC-20 token.
    //So when you deposit ETH it's swapped for WETH
    await getWeth()
    const { deployer } = await getNamedAccounts()

    // to interact with the aave protocol we need.
    // abi
    // contract address
    // lending pool address provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address ${lendingPool.address}`)

    //deposit collateral! ETH / WETH

    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    // approve before depositing.
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing...")
    //the deposit function requires the following params (https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool)
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited!")

    //how much we have borrowed, how much we have in collateral, how much we can borrow
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)

    //availableBorrowsETH ?? What the conversion rate on Dai is? Get Dai price using chainlink price feeds.
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())

    // Now let's borrow.
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(lendingPool, deployer)

    //repay
    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
    await getBorrowUserData(lendingPool, deployer)
}

// Amount to repay, dai address we are going to repay, the lendingPool and account.
async function repay(amount, daiAddress, lendingPool, account) {
    // we need to first approve sending our DAI back to aave.
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    //sending it back
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed! ")
}

async function getDaiPrice() {
    // we won't need to connect to deployer/signer since we are only reading from this contract not sending transactions
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    // we grab only the answer which is at index 1
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)

    return price
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH`)

    return { availableBorrowsETH, totalDebtETH }
}
async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!")
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
