## Installation

```sh
$ npm install
```

## Usage

  Usage: mass-token-transfer [options] \<file\>

  Transfer token according distribution in \<file\>

  See example in `transfers.json`
  All amounts is shifted into [digits] to left
  e.g. `0.5` Tokens with default `18` digits is `500000000000000000`

Command line for `Rinkeby` testnet
```sh
node mass-token-transfer.js --from 0xaaaef272eadaabfccd2f11cb1838d917c506bfe5 --contract 0xb6b91128b3a57f473f904c7d55367344d2581f7e --ipc ~/.ethereum/rinkeby/geth.ipc --abi ./abi.json transfers.json
```

## For other options

```sh
node mass-token-transfer.js --help
```

## License

MIT © [SmartDec](smartdec.net)
