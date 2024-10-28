//SPDX-license-identifier:MIT

pragma solidity ^0.8.7;

// in order to import this we will have to do "yarn add --dev @chainlink/contracts
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffel__UpKeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/** @title A sample Raffle Contract
 * @author Joran Vanwesenbeeck
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev This implements chainlink VRF v2 and chainlink Keepers.
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* TYpe declarations */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /*state Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callBackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    //lottery variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /*events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /* Functions*/
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callBackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callBackGasLimit = callBackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the chainlink keeper nodes call
     * they look for the 'UpkeepNeeded' to return true.
     * the following should be true in order to return true:
     * 1. our time interval should have passed
     * 2. the lottery should have at least 1 player, and have some ETH
     * 3. our subscription is funded with LINK
     * 4. The lottery should be in "open" state.
     */
    function checkUpkeep(
        bytes memory /*checkDate*/
    ) public override returns (bool upKeepNeeded, bytes memory /*performData*/) {
        //  performdata is used in case the function following after the checkupkeep depends of the outcome of checkupkeep
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        upKeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance); // checks if these are all true
    }

    function performUpkeep(bytes calldata /*performData*/) external override {
        // =requestRandomWinner function ,  calldate ia a type like storage or memory
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert Raffel__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, //= keyHash = max fee u want to pay in wei for a request
            i_subscriptionId, // = the subscription ID that this contract uses for funding the request
            REQUEST_CONFIRMATIONS,
            i_callBackGasLimit, // how much gas u max want to spend for the fulfillRandomWords
            NUM_WORDS //= how many random numbers you want to get
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0); // s_players is now a new list of addresses of the size 0
        s_lastTimeStamp = block.timestamp;
        (bool succes, ) = recentWinner.call{value: address(this).balance}("");
        if (!succes) {
            revert Raffle__TransferFailed();
        }
        // to keep track of all the winners
        emit WinnerPicked(recentWinner);
    }

    // %=module = the what rests after a devision;   word = numbers, computer language

    /*view functions*/
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        // pure because it is saved in bytecode and not even in storage
        return NUM_WORDS; // = return 1;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
