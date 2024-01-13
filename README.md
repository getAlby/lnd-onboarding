# LND Onboarding

This wizard helps you to setup your new LND lightning node by helping you create your first channel and start sending lightning payments.

## Development

`yarn install`
`yarn dev`

### Regtest Setup

Setup a [polar](https://lightningpolar.com/) network with 2 LND nodes.

Update the `RECOMMENDED_NODES` to use the nodes you created e.g.

```js
{
  title: "alice",
  pubkey:
    "02480dada93b7f44be452f245c63868eac33d55bd98db8f3bae0c6fbd2378d9ad1",
  host: "alice:8080",
},
```

[See this answer](https://stackoverflow.com/a/15076602) to fix the certificate issues when connecting to one of the nodes with Alby.
