const config = require('../config.json');
const async = require('async');
const IpfsDaemon = require('../ipfs-daemon/src/ipfs-node-daemon');
const OrbitDB = require('orbit-db');

var orbit;
var docstore;

////////////////////
// Database creation
////////////////////

function prepareDatabase(doneCallback) {

    console.log('Data dir: ' + config.ipfs.IpfsDataDir);
    const dataDir = config.ipfs.IpfsDataDir;
    config.ipfs.LogDirectory = dataDir + '/log';

    var ipfs = new IpfsDaemon(config.ipfs);
    var prepared = false;

    console.log('Waiting for database...');

    ipfs.on('error',
        function (err) {
            console.log('Error handled');
            console.error(err);
        }
    );

    ipfs.on('ready',
        function () {
            console.log('Ready state handled');
            orbit = new OrbitDB(ipfs, 'cybernode');
            console.log('Database initialized');
            docstore = orbit.docstore('mainstore', { indexBy: 'key' });
            console.log('Docstore initialized');
            //FIXME if db empty freezing here
            docstore.events.on('ready', function() {
                console.log('Database ready');
                if (!prepared) {
                    prepared = true;
                    console.log('Callback');
                    doneCallback();
                }
            });
            setTimeout(function () {
                console.log('Timeout');
                if (!prepared) {
                    prepared = true;
                    console.log('Callback');
                    doneCallback();
                }
            }, 3000);

            console.log('Waiting docstore load');
            docstore.load();
        }
    );

}

function disconnect(doneCallback) {
    orbit.disconnect();
    console.log('Disconnected');
}

////////////
// Save data
////////////

function insertBlock(block, system, callback) {
    block.system = system;
    block.key='block-'+block.hash;
    docstore.put(block).then(callback);
}

function insertTx(tx , system, callback) {
    tx.system = system;
    tx.key='tx-'+tx.txid;
    docstore.put(tx).then(callback); 
}


///////////
// Get data
///////////

function getBlockByHeight(height, system, callback) {
    var result = docstore.query(function (e) {
        return (e.system == system && e.height == height);
    });
    callback(null, result.length > 0 ? result[0] : null);
}

function getBlockByHash(hash, system, callback) {
    var result = docstore.get('block-' + hash);
    callback(null, result.length > 0 ? result[0] : null);
}

function getTxByTxid(txid, system, callback) {
    var result = docstore.get('tx-' + txid);
    callback(null, result.length > 0 ? result[0] : null);
}

/////////////
// Agregation
/////////////
function hasHeight(height, system, callback) {
    var result = docstore.query(function (e) {
        return (e.system == system && e.height == height);
    });
    callback(result.length > 0);
}

function getHeight(system, doneCallback) {
    hasHeight(0, system, function (exists) {
        if (!exists) {
            doneCallback(-1);
            return;
        }

        var q = {min: 0, max: 1, limited: false};
        async.until(
            function () {
                return q.limited && q.min + 1 == q.max;
            },
            function (callback) {
                searchForBorder(q, system, function (next) {
                    q = next;
                    callback();
                })
            },
            function (err) {
                doneCallback(q.min)
            });
    });
}

function searchForBorder(search, system, callback) {
    if (!search.limited) {
        hasHeight(search.max * 2, system, function (has) {
            callback({min: search.max, max: 2 * search.max, limited: !has})
        });
    } else {
        hasHeight((search.min + search.max) / 2, system, function (has) {
            callback({
                min: has ? (search.min + search.max) / 2 : search.min,
                max: has ? search.max : (search.min + search.max) / 2,
                limited: true
            })
        });
    }
}

module.exports.prepareDatabase = prepareDatabase;
module.exports.insertBlock = insertBlock;
module.exports.insertTx = insertTx;
module.exports.getHeight = getHeight;
module.exports.getBlockByHash = getBlockByHash;
module.exports.getBlockByHeight = getBlockByHeight;
module.exports.getTxByTxid = getTxByTxid;
module.exports.disconnect = disconnect;
