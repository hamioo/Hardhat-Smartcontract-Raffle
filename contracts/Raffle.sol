// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__IsNotOpen();
error Raffle__lowAmountOfETH();
error Raffle__withdrawFailed();
error Raffle__UpkeepNotNeeded(uint256 timeStamp, uint256 numPlayers, uint256 raffleState);

/**@title A sample Raffle Contract
 * @author Hamid Mohammadi
 * @notice This contract is for creating a sample raffle contract
 * @dev This implements the Chainlink VRF Version 2
 */

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Rype declarations*/
    enum RaffleState {
        Open,
        Calculating
    }

    // state Variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinatorV2;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATION = 3;
    uint32 private constant NUMBER_WORDS = 1;
    // events //
    event raffleEnter(address indexed player);
    event requestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed player);

    /*lottary variables */
    address payable private s_recentWinner;
    RaffleState private s_RaffleState;
    uint256 private s_lastTimestamp;
    uint256 private immutable i_timeInterval;

    // constructor
    constructor(
        address _vrfCoordinatorV2,
        uint256 _entranceFee,
        bytes32 _gasLane,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint256 _timeInterval
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        i_entranceFee = _entranceFee;
        i_vrfCoordinatorV2 = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_gasLane = _gasLane;
        i_subscriptionId = _subscriptionId;
        i_callbackGasLimit = _callbackGasLimit;
        s_RaffleState = RaffleState.Open;
        s_lastTimestamp = block.timestamp;
        i_timeInterval = _timeInterval;
    }

    // functions
    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__lowAmountOfETH();
        }
        if (s_RaffleState != RaffleState.Open) {
            revert Raffle__IsNotOpen();
        }
        s_players.push(payable(msg.sender));
        emit raffleEnter(msg.sender);
    }

    /**
     * @dev this checkUpkeep function is the function that chainlink calls and watch the trigger
     *and it should pup the trigger when this under these conditions:
     * 1.the time of raffle ended up
     * 2.the raffle statment be open
     * 3.have at least 1 players ,and have eth in contract
     * 4.the suscription funded with LINK
     */
    function checkUpkeep(
        bytes memory /* checkData */
    ) public override returns (bool upkeepNeeded, bytes memory /*performData */) {
        bool isopen = (s_RaffleState == RaffleState.Open);
        bool timeCheck = (block.timestamp - s_lastTimestamp >= i_timeInterval);
        bool playersCheck = (s_players.length > 0);
        upkeepNeeded = (isopen && timeCheck && playersCheck);
    }

    function performUpkeep(bytes calldata /*performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                block.timestamp - s_lastTimestamp,
                s_players.length,
                uint256(s_RaffleState)
            );
        }
        s_RaffleState = RaffleState.Calculating;
        uint256 requestId = i_vrfCoordinatorV2.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATION,
            i_callbackGasLimit,
            NUMBER_WORDS
        );
        emit requestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_players = new address payable[](0);
        s_lastTimestamp = block.timestamp;
        (bool succcess, ) = recentWinner.call{value: address(this).balance}("");
        if (!succcess) {
            revert Raffle__withdrawFailed();
        }
        s_RaffleState = RaffleState.Open;
        emit WinnerPicked(recentWinner);
    }

    /*view/pure functions */
    function getEntrancFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getTimeInterval() public view returns (uint256) {
        return i_timeInterval;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_RaffleState;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimestamp;
    }
}
