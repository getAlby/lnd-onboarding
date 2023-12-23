import { GetInfoResponse } from "@webbtc/webln-types";
import React from "react";

import lndImage from "./assets/lnd.png";
import albyImage from "./assets/alby.png";
import { getTransactionId, hexToBase64 } from "./utils";

const MIN_BALANCE = 250_000;
const RECOMMENDED_NODES: RecommendedChannel[] = [
  {
    title: "alice",
    pubkey:
      "02480dada93b7f44be452f245c63868eac33d55bd98db8f3bae0c6fbd2378d9ad1",
    host: "alice:8080",
  },
  {
    title: "bob",
    pubkey:
      "035b8fcbe2072b5f92f7d420f5f43eeba17fa1d977e0acc2afff7ae4dca4cad136",
    host: "bob:8082",
  },
];

type RecommendedChannel = {
  title: string;
  pubkey: string;
  host: string;
};

const steps = ["Connect Node", "Fund Node", "Open Channel"];

function App() {
  const [currentStepIndex, setStepIndex] = React.useState(0);
  const [isLoading, setLoading] = React.useState(true);
  const [balance, setBalance] = React.useState<
    { confirmed: number; unconfirmed: number } | undefined
  >();
  const [address, setAddress] = React.useState<string>();
  const [connectPubkey, setConnectPubkey] = React.useState<string>();
  const [connectHost, setConnectHost] = React.useState<string>();
  const [channelOpenTransactionId, setChannelOpenTransactionId] =
    React.useState<string>();

  React.useEffect(() => {
    (async () => {
      async function init() {
        if (!window.webln?.request) {
          return;
        }
        await window.webln.enable();
        const info: GetInfoResponse = await window.webln.getInfo();
        if (
          info.methods.indexOf("request.walletbalance") < 0 ||
          info.methods.indexOf("request.newaddress") < 0
        ) {
          return;
        }
        setStepIndex(1);
        const balanceResponse = (await window.webln.request(
          "walletbalance"
        )) as {
          confirmed_balance: string;
          unconfirmed_balance: string;
        };
        setBalance({
          confirmed: parseInt(balanceResponse.confirmed_balance),
          unconfirmed: parseInt(balanceResponse.unconfirmed_balance),
        });
        if (parseInt(balanceResponse.confirmed_balance) >= MIN_BALANCE) {
          setStepIndex(2);
        } else {
          const newaddressResponse = (await window.webln.request(
            "newaddress"
          )) as { address: string };
          setAddress(newaddressResponse.address);
        }
      }
      await init();
      setLoading(false);
    })();
  }, []);

  async function openChannel() {
    if (!window.webln?.request) {
      throw new Error("WebLN provider does not support webln.request");
    }
    if (!connectPubkey || !connectHost) {
      alert("Please fill out pubkey and host of node you wish to connect to");
      return;
    }
    try {
      const connectPeerResponse = await window.webln.request("connectpeer", {
        addr: {
          pubkey: connectPubkey,
          host: connectHost,
        },
        perm: true,
        timeout: 10,
      });

      console.log("Connect peer response: ", connectPeerResponse);
    } catch (error) {
      console.error(error);
    }
    try {
      const openChannelResponse = (await window.webln.request("openchannel", {
        node_pubkey: hexToBase64(connectPubkey),
        local_funding_amount: Math.floor(MIN_BALANCE * 0.9), // reserve enough balance for channel open fee
        push_sat: 0,
      })) as { funding_txid_bytes: string };
      console.log("Open channel response", openChannelResponse);
      setChannelOpenTransactionId(
        getTransactionId(openChannelResponse.funding_txid_bytes)
      );
    } catch (error) {
      console.error(error);
      alert("Failed to open channel: " + (error as Error).toString());
    }
  }

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <div
      data-theme="bumblebee"
      className="flex justify-center items-start w-full min-h-full p-8 font-sans"
    >
      <div className="flex flex-col justify-center items-center max-w-lg w-full">
        <h1 className="text-2xl mb-4 font-bold">LND Onboarding</h1>
        <div className="flex justify-center items-center gap-4 mb-8">
          <img src={albyImage} className="w-16 h-16 rounded" />
          <p>✗</p>
          <img src={lndImage} className="w-16 h-16 rounded" />
        </div>
        <div className="flex flex-col justify-center items-center w-full shadow-lg rounded-2xl mb-8 p-4">
          <h2 className="text-lg mb-8 font-semibold">
            {steps[currentStepIndex]}
          </h2>
          {currentStepIndex === 0 && (
            <>
              <ol className="list-decimal list-inside">
                <li>Install the Alby extension</li>
                <li>
                  Get your lightning node. We currently recommend Voltage cloud
                  to quickly get a cloud hosted node
                </li>
                <li>Connect to your Lightning node from the Alby extension</li>
              </ol>
              <p className="italic mt-4">
                Once the above steps are done, please refresh this page.
              </p>
            </>
          )}
          {currentStepIndex === 1 && (
            <>
              <p>
                Please send at least {MIN_BALANCE} sats to your node and wait
                for onchain confirmation.
              </p>
              <p className="mt-4">Here's a deposit address:</p>
              <input
                readOnly
                className="input input-bordered w-full text-center mb-4"
                value={address}
              />

              <p>Confirmed balance: {balance?.confirmed} sats</p>
              <p>Unconfirmed balance: {balance?.unconfirmed} sats</p>
            </>
          )}
          {currentStepIndex === 2 && channelOpenTransactionId && (
            <>
              <h3 className="font-semibold mb-4">Channel opening!</h3>
              <p className="mb-4">
                Please wait for a few onchain confirmations and you'll be able
                payments with Alby.
              </p>
              <a
                className="link"
                target="_blank"
                href={`https://mempool.space/tx/${channelOpenTransactionId}`}
              >
                View on Mempool.space
              </a>
            </>
          )}
          {currentStepIndex === 2 && !channelOpenTransactionId && (
            <>
              <p>Confirmed balance: {balance?.confirmed} sats</p>

              <p className="mt-8 font-semibold mb-4">Recommended nodes</p>
              <div className="flex flex-col gap-2">
                {RECOMMENDED_NODES.map((node) => (
                  <div
                    key={node.pubkey}
                    className="bg-neutral-100 w-full p-4 rounded"
                  >
                    <h2 className="card-title">{node.title}</h2>
                    <div className="flex gap-4">
                      <p className="break-all text-sm">{node.pubkey}</p>
                      <div className="card-actions justify-end">
                        <button
                          onClick={() => {
                            setConnectPubkey(node.pubkey);
                            setConnectHost(node.host);
                          }}
                          className="btn btn-primary"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full">
                <p className="mt-8">Connect to node</p>
                <input
                  className="input input-bordered w-full text-center mb-4"
                  value={connectPubkey}
                  onChange={(e) => setConnectPubkey(e.target.value)}
                  placeholder="node pubkey"
                />
                <input
                  className="input input-bordered w-full text-center mb-4"
                  value={connectHost}
                  onChange={(e) => setConnectHost(e.target.value)}
                  placeholder="node host"
                />
                <button
                  className="btn btn-primary btn-lg w-full"
                  onClick={openChannel}
                >
                  Open Channel
                </button>
              </div>
            </>
          )}
        </div>
        <ul className="steps text-xs">
          {steps.map((step, index) => (
            <li
              key={step}
              className={`step ${currentStepIndex >= index && "step-primary"}`}
            >
              <div className="px-4">{step}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
