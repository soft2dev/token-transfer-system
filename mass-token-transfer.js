#!/usr/bin/env node
const program = require('commander');

program
    .version('0.1.0')
    .option('-f, --from <value>', 'From address')
    .option('-i, --ipc [value]', 'Geth ipc path', '~/.ethereum/geth.ipc')
    .option('-c, --contract <value>', 'Contract address')
    .option('-a, --abi <value>', 'Contract ABI file path')
    .option('-g, --gasPrice [value]', 'Gas price', parseInt, 40000000000)
    .option('-l, --gasLimit [value]', 'Gas limit', parseInt, 60000)
    .option('-d, --digits [value]', 'Token digits' , parseInt, 18)
    .arguments('<file>').description('Transfer token according distribution in <file>\r\n\r\n' +
    '  See example in transfers.json\r\n' +
    '  All amounts is shifted into [digits] to left\r\n' +
    '  e.g. 0.5 Tokens with default 18 digits is 500000000000000000')
    .action(function (file) {
        contentFile = file;
    });
program.parse(process.argv);

function printError(error) {
    console.error(error);
    program.outputHelp();
    process.exit(1);
}

if (typeof program.from === 'undefined') {
    printError('Not specified from');
}
if (typeof program.ipc === 'undefined') {
    printError('Not specified ipc path to geth');
}
if (typeof program.contract === 'undefined') {
    printError('Not specified contract address');
}
if (typeof program.abi === 'undefined') {
    printError('Not specified abi file');
}
if (typeof contentFile === 'undefined') {
    printError('Not specified transfer file');
}

const fs = require("fs"); //Used for file read and write
const Web3 = require("web3");
const async = require("async");
const net = require("net");

const client = new net.Socket();

if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
} else {
    web3 = new Web3(new Web3.providers.IpcProvider(program.ipc, client)); // for serverss
}

//isConnected() is not working with IPC provider with beta web3 version
if (typeof web3 === undefined || !web3.isConnected()) {
    printError('Ipc path is wrong or geth not started');
}

//Loading contract ABI
const Contract_ABI = require(program.abi);
const ContractObj = web3.eth.contract(Contract_ABI).at(program.contract); // making a object for contract (Use the owner address from which the contract is deployed)

const read = require('read');
const BigNumber = require("web3/bower/bignumber.js/bignumber");

fs.writeFileSync('log.txt', '');
fs.readFile(contentFile, 'utf8', (err, data) => {
    if (err) throw err;
    let obj = JSON.parse(data);
    let totalTokens = new BigNumber(0);
    let estimatedETH = new BigNumber(0);
    for (let transfer of obj) {
        totalTokens = totalTokens.plus(new BigNumber(transfer.amount).shift(program.digits));
        estimatedETH = estimatedETH.plus(new BigNumber(program.gasLimit).mul(program.gasPrice));
    }

    console.log('Total number of payments: ' + obj.length);
    console.log('Total number of transfered tokens: ' + totalTokens.toFixed(0));
    console.log('Estimated max ETH for gas: ' + estimatedETH.shift(-program.digits).toFixed(5));
    read({prompt: 'To confirm and unlock wallet enter password: ', silent: true}, function (err, password) {
        if (err) throw err;
        async.forEachOfLimit(obj, 5, function (value, key, callback) { // Using each data in the obj for further transaction
                if (web3.isAddress(value.address) && value.address && value.amount) {
                    let amount = new BigNumber(value.amount).shift(program.digits);

                    web3.personal.unlockAccount(program.from, password, 0, (err, unlocked) => { //Unlock account using passPhrase
                        if (err) throw err;
                        ContractObj.transfer(value.address, amount, {
                            from: program.from,
                            gas: program.gasLimit,
                            gasPrice: program.gasPrice
                        }, (error, txid) => {
                            if (error) {
                                console.log({
                                    status: false,
                                    message: "Error in Transaction",
                                    error: error
                                });
                                throw error;
                            }
                            let datas = {
                                address: value.address,
                                value: amount,
                                txid: txid
                            };
                            fs.appendFile("log.txt", JSON.stringify(datas, null, 2) + '\n', function (err) { //writing file to test.txt
                                if (err) throw err;
                                console.log('Payout to ' + value.address + ' proceeded in tx ' + txid);
                                callback();
                            });
                        });
                    });
                }
            },
            function (err) {
                if (err) {
                    console.log('Something goes wrong ' + err);
                    throw err;
                } else {
                    console.log('All transactions completed, more details in log.txt');
                    process.exit()
                }
            }
        );
    });
});