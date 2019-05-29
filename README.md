# didjs

`didjs` is a javascript package that parses and stringifies
[Decentralized Identifiers (DIDs)](https://w3c-ccg.github.io/did-spec).

## Install

```
yarn add didjs
```
or
```html
<script type="text/javascript" src="./dist/didjs.min.js"></script>
```

## Example

```js
import * as did from 'didjs'

const d = did.parse('did:example:1234567890/asdf/qwerty')
console.log(d)
```

The above example parses the input string according to the rules defined in the [DID Grammar](did.abnf) and prints the following:

```js
{
    id: "1234567890",
    idStrings: ["1234567890"],
    method: "example",
    path: "asdf/qwerty",
    pathSegments: ["asdf", "qwerty"]
}
```

The input string may also be a [DID Reference](https://w3c-ccg.github.io/did-spec/#dfn-did-reference) with a
[DID Fragment](https://w3c-ccg.github.io/did-spec/#dfn-did-fragment):

```js
const d = did.parse("did:example:1234567890#keys-1")
console.log(d.fragment)
// Output: keys-1
```

This package also stringifies DID objects into valid DID strings:

```js
const d = {
    method: 'example',
    id: '1234567890'
}
console.log(did.stringify(d))
// Output: did:example:1234567890
```

or with a refence with a fragment:

```js
const d = {
    method: 'example',
    id: '1234567890',
    fragment: 'keys-1'
}
console.log(did.stringify(d))
// Output: did:example:1234567890#keys-1
```

## Build

To compile the code in this repository, run:

```
webpack
```

## Test

This repository includes a [suite of tests](test.js) that check for various edge cases within
the [DID Grammar](did.abnf).

To run the tests, run:

```
npm run test
```

### Thanks

This library is based on a great DID parsing implementation in Golang by [ockam-network](https://github.com/ockam-network/did).

## License

This package is licensed under [Apache License 2.0](LICENSE).