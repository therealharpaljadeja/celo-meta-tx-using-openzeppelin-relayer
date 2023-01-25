const { expect } = require("chai");
const { ethers } = require("hardhat");

const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
];

const ForwardRequest = [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "data", type: "bytes" },
];

async function deploy(name, ...params) {
    const Contract = await ethers.getContractFactory(name);
    return await Contract.deploy(...params).then((f) => f.deployed());
}

function getMetaTxTypeData(chainId, verifyingContract) {
    return {
        types: {
            EIP712Domain,
            ForwardRequest,
        },
        domain: {
            name: "MinimalForwarder",
            version: "0.0.1",
            chainId,
            verifyingContract,
        },
        primaryType: "ForwardRequest",
    };
}

async function signTypedData(signer, from, data) {
    // If signer is a private key, use it to sign
    if (typeof signer === "string") {
        const privateKey = Buffer.from(signer.replace(/^0x/, ""), "hex");
        return ethSigUtil.signTypedMessage(privateKey, { data });
    }

    // Otherwise, send the signTypedData RPC call
    // Note that hardhatvm and metamask require different EIP712 input
    const [method, argData] = ["eth_signTypedData_v4", JSON.stringify(data)];
    return await signer.send(method, [from, argData]);
}

async function buildTypedData(forwarder, request) {
    const chainId = await forwarder.provider
        .getNetwork()
        .then((n) => n.chainId);
    const typeData = getMetaTxTypeData(chainId, forwarder.address);
    return { ...typeData, message: request };
}

async function signMetaTxRequest(signer, forwarder, input) {
    const request = await buildRequest(forwarder, input);
    const toSign = await buildTypedData(forwarder, request);
    const signature = await signTypedData(signer, input.from, toSign);
    return { signature, request };
}

async function buildRequest(forwarder, input) {
    const nonce = await forwarder
        .getNonce(input.from)
        .then((nonce) => nonce.toString());
    return { value: 0, gas: 1e6, nonce, ...input };
}

describe("contracts/Badges", function () {
    beforeEach(async () => {
        this.forwarder = await deploy("MinimalForwarder");
        this.badges = await deploy(
            "Badges",
            this.forwarder.address,
            "https://www.google.com"
        );
        this.accounts = await ethers.getSigners();
    });

    it("Should be able to mint badge using meta-tx", async () => {
        const signer = this.accounts[1];
        const relayer = this.accounts[2];
        const forwarder = this.forwarder.connect(relayer);
        const badges = this.badges;

        const { request, signature } = await signMetaTxRequest(
            signer.provider,
            forwarder,
            {
                from: signer.address,
                to: badges.address,
                data: badges.interface.encodeFunctionData("mint", [
                    signer.address,
                    "0",
                    "0x",
                ]),
            }
        );

        await forwarder.execute(request, signature).then((tx) => tx.wait());
        expect(await badges.balanceOf(signer.address, 0)).to.be.eq(1);
    });
});
