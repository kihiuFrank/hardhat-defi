/* eslint-disable no-process-exit */
// yarn hardhat node
// yarn hardhat run scripts/readPrice.js --network localhost
const { ethers } = require("hardhat")

async function main() {
    //protocol treats everything as ERC20 token
    const priceConsumerV3 = await ethers.getContract("PriceConsumerV3")
    const price = await priceConsumerV3.getLatestPrice()
    console.log(price.toString())
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
