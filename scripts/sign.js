const { ethers } = require("hardhat");
const { signMetaTxRequest } = require("../src/signer");
const { readFileSync, writeFileSync } = require("fs");

function getInstance(name) {
    const address = JSON.parse(readFileSync("deploy.json"))[name];
    if (!address) throw new Error(`Contract ${name} not found in deploy.json`);
    return ethers.getContractFactory(name).then((f) => f.attach(address));
}

async function main() {
    const forwarder = await getInstance("MinimalForwarder");
    const badges = await getInstance("Badges");

    const { PRIVATE_KEY: signer } = process.env;
    const from = new ethers.Wallet(signer).address;
    console.log(`Signing minting of badge for ${from}...`);
    const data = badges.interface.encodeFunctionData("mint", [from, 0, "0x"]);
    const result = await signMetaTxRequest(signer, forwarder, {
        to: badges.address,
        from,
        data,
    });

    writeFileSync("tmp/request.json", JSON.stringify(result, null, 2));
    console.log(`Signature: `, result.signature);
    console.log(`Request: `, result.request);
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
