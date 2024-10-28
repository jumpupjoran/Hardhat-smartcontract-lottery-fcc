# Raffle Project

This project implements a decentralized raffle on the Ethereum blockchain, using Chainlink VRF (Verifiable Random Function) for secure, random winner selection. The project includes a mock VRF Coordinator for local development and deployment scripts for setting up the raffle on a test network.

## Table of Contents

-   [Raffle Project](#raffle-project)
    -   [Table of Contents](#table-of-contents)
    -   [Overview](#overview)
    -   [Project Structure](#project-structure)
    -   [Smart Contracts](#smart-contracts)
        -   [Raffle.sol](#rafflesol)
        -   [VRFCoordinatorV2Mock.sol](#vrfcoordinatorv2mocksol)
    -   [Deployment and Testing](#deployment-and-testing)
        -   [Prerequisites](#prerequisites)
        -   [Steps](#steps)
    -   [Usage](#usage)
    -   [Front-End Integration](#front-end-integration)
    -   [Requirements](#requirements)
    -   [License](#license)

## Overview

The Raffle project allows users to enter a raffle by paying an entrance fee, with a winner selected at intervals using Chainlink VRF for secure randomness. The raffle state and timing are managed by Chainlink Keepers, which automate the upkeep to select a winner based on specified intervals.

## Project Structure

-   **Contracts**

    -   `Raffle.sol`: The main raffle contract, implementing entry, upkeep, and winner selection.
    -   `VRFCoordinatorV2Mock.sol`: Mock contract for Chainlink VRF, used for local development.

-   **Deployment Scripts**

    -   `00-deploy-mocks.js`: Deploys the VRF mock for local development.
    -   `01-deploy-raffle.js`: Deploys the Raffle contract and sets up Chainlink VRF.
    -   `99-update-front-end.js`: Updates front-end contract address and ABI after deployment.

-   **Tests**
    -   `Raffle.test.js`: Unit tests for the raffle functionality in a local environment.
    -   `Raffle.staging.test.js`: Integration tests for the raffle on a test network.

## Smart Contracts

### Raffle.sol

-   **Functions**:
    -   `enterRaffle`: Allows users to enter the raffle by paying the entrance fee.
    -   `performUpkeep`: Called by Chainlink Keepers to check and manage the raffle state at specified intervals.
    -   `fulfillRandomWords`: Uses Chainlink VRF to randomly select a winner and transfer funds.
-   **Events**:
    -   `RaffleEnter`: Emitted when a user enters the raffle.
    -   `WinnerPicked`: Emitted when a winner is chosen.

### VRFCoordinatorV2Mock.sol

Used in local environments to simulate Chainlink VRF functionality.

## Deployment and Testing

### Prerequisites

-   [Node.js](https://nodejs.org/)
-   [Hardhat](https://hardhat.org/)
-   [Ethers.js](https://docs.ethers.io/v5/)

### Steps

1. **Install Dependencies**:

    ```bash
    npm install

    ```

2. **Deploy Contracts**:

    - **Deploy VRF mock**:

        ```bash
        npx hardhat run scripts/00-deploy-mocks.js --network localhost
        ```

    - **Deploy the Raffle contract**:
        ```bash
        npx hardhat run scripts/01-deploy-raffle.js --network <network-name>
        ```

3. **Run Tests**:

    - **Unit tests**:

        ```bash
        npx hardhat test
        ```

    - **Staging tests**:
        ```bash
        npx hardhat test --network <test-network>
        ```

## Usage

1. **Enter the Raffle**: Users can enter the raffle by calling the `enterRaffle` function and providing the entrance fee specified in the contract.

2. **Automated Upkeep**: Chainlink Keepers call `performUpkeep` to verify if upkeep is needed (e.g., enough time has passed, the raffle is open, and there are players).

3. **Random Winner Selection**: Chainlink VRF picks a random winner, transferring the pot to the selected address and resetting the raffle.

## Front-End Integration

To integrate with a front-end:

1. Update the front-end contract address and ABI by running:
    ```bash
    npx hardhat run scripts/99-update-front-end.js --network <network-name>
    ```

## Requirements

-   Hardhat and dependencies specified in `package.json`
-   Chainlink VRF and Keepers for randomness and automation
-   `.env` file for environment variables:
    ```env
    ETHERSCAN_API_KEY=<Your Etherscan API Key>
    UPDATE_FRONT_END=true
    ```

## License

MIT License
