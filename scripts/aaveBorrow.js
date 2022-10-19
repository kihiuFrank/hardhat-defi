/* eslint-disable no-process-exit */
// yarn hardhat node
// yarn hardhat run scripts/aaveBorrow.js --network localhost
const { ethers } = require("hardhat")
const { getWeth } = require("./getWeth")

async function main() {
    //protocol treats everything as ERC20 token
    await getWeth()
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
