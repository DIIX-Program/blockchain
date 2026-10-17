// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ColdChainTracker
 * @notice Anchors cryptographic hashes and custody handover events for smart cold-chain batches.
 * @dev High-frequency sensor telemetry stays off-chain in PostgreSQL. Only batch digests/roots are committed.
 */
contract ColdChainTracker {
    address public owner;

    enum EventType {
        CREATED,
        DISPATCHED,
        IN_TRANSIT,
        HANDOVER,
        DELIVERED,
        ALERT
    }

    struct AnchorRecord {
        bytes32 dataHash;
        uint256 timestamp;
        address submitter;
        uint32 readingCount;
        string schemaVersion;
        bool exists;
    }

    struct CustodyEvent {
        bytes32 batchId;
        EventType eventType;
        string location;
        address fromActor;
        address toActor;
        uint256 timestamp;
    }

    mapping(bytes32 => AnchorRecord) public batchAnchors;
    mapping(bytes32 => CustodyEvent[]) public batchEvents;
    mapping(address => bool) public authorizedWorkers;

    event BatchDataAnchored(
        bytes32 indexed batchId,
        bytes32 indexed dataHash,
        address indexed submitter,
        uint256 timestamp
    );

    event CustodyTransferred(
        bytes32 indexed batchId,
        EventType eventType,
        address indexed fromActor,
        address indexed toActor,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "ColdChainTracker: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedWorkers[msg.sender],
            "ColdChainTracker: caller is not authorized"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedWorkers[msg.sender] = true;
    }

    function setWorkerAuthorization(address worker, bool authorized) external onlyOwner {
        authorizedWorkers[worker] = authorized;
    }

    function anchorBatchData(
        bytes32 batchId,
        bytes32 dataHash,
        uint32 readingCount,
        string calldata schemaVersion
    ) external onlyAuthorized {
        require(batchId != bytes32(0), "ColdChainTracker: invalid batchId");
        require(dataHash != bytes32(0), "ColdChainTracker: invalid dataHash");

        batchAnchors[batchId] = AnchorRecord({
            dataHash: dataHash,
            timestamp: block.timestamp,
            submitter: msg.sender,
            readingCount: readingCount,
            schemaVersion: schemaVersion,
            exists: true
        });

        emit BatchDataAnchored(batchId, dataHash, msg.sender, block.timestamp);
    }

    function recordCustodyEvent(
        bytes32 batchId,
        EventType eventType,
        string calldata location,
        address toActor
    ) external onlyAuthorized {
        require(batchId != bytes32(0), "ColdChainTracker: invalid batchId");

        batchEvents[batchId].push(
            CustodyEvent({
                batchId: batchId,
                eventType: eventType,
                location: location,
                fromActor: msg.sender,
                toActor: toActor,
                timestamp: block.timestamp
            })
        );

        emit CustodyTransferred(batchId, eventType, msg.sender, toActor, block.timestamp);
    }

    function getBatchAnchor(bytes32 batchId)
        external
        view
        returns (
            bytes32 dataHash,
            uint256 timestamp,
            address submitter,
            uint32 readingCount,
            string memory schemaVersion,
            bool exists
        )
    {
        AnchorRecord memory record = batchAnchors[batchId];
        return (
            record.dataHash,
            record.timestamp,
            record.submitter,
            record.readingCount,
            record.schemaVersion,
            record.exists
        );
    }

    function getBatchEventsCount(bytes32 batchId) external view returns (uint256) {
        return batchEvents[batchId].length;
    }
}
