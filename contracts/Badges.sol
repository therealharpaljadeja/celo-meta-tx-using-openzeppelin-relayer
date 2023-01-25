// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Badges is ERC2771Context, ERC1155 {
    constructor(MinimalForwarder forwarder, string memory uri_)
        ERC2771Context(address(forwarder))
        ERC1155(uri_)
    {}

    function _msgData()
        internal
        view
        virtual
        override(ERC2771Context, Context)
        returns (bytes calldata)
    {
        return super._msgData();
    }

    function _msgSender()
        internal
        view
        virtual
        override(ERC2771Context, Context)
        returns (address sender)
    {
        return super._msgSender();
    }

    function mint(
        address to,
        uint256 id,
        bytes memory data
    ) external {
        _mint(to, id, 1, data);
    }
}
