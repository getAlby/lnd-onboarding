import { GetInfoResponse } from "@webbtc/webln-types";
import React from "react";

import lndImage from "./assets/lnd.png";
import albyImage from "./assets/alby.png";
import { getTransactionId, hexToBase64 } from "./utils";

const RECOMMENDED_NODES: RecommendedNode[] = [
  {
    title: "ACINQ",
    pubkey:
      "03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f",
    host: "3.33.236.230:9735",
    min: 550000,
  },
  {
    title: "deezy prime ⚡ ✨",
    pubkey:
      "0214ec5397050f7eec8e574d1d6feaa0c992169ed107056e6bd57aed1e94714851",
    host: "54.159.16.197:9735",
    min: 550000,
  },
  {
    title: "bitfinex.com",
    pubkey:
      "03cde60a6323f7122d5178255766e38114b4722ede08f7c9e0c5df9b912cc201d6",
    host: "34.65.85.39:9745",
    min: 550000,
  },
  {
    title: "Breez",
    pubkey:
      "031015a7839468a3c266d662d5bb21ea4cea24226936e2864a7ca4f2c3939836e0",
    host: "212.129.58.219:9735",
    min: 10100000,
  },
  {
    title: "kappa",
    pubkey:
      "0324ba2392e25bff76abd0b1f7e4b53b5f82aa53fddc3419b051b6c801db9e2247",
    host: "54.69.203.247:9735",
    min: 350000,
  },
  {
    title: "Voltage.cloud (C2)",
    pubkey:
      "02cfdc6b60e5931d174a342b20b50d6a2a17c6e4ef8e077ea54069a3541ad50eb0",
    host: "52.89.237.109:9735",
    min: 350000,
  },
];

type RecommendedNode = {
  title: string;
  pubkey: string;
  host: string;
  min: number;
};

const steps = ["Connect Node", "Fund Your Node", "Open Channel"];

function App() {
  const [connectError, setConnectError] = React.useState("");
  const [currentStepIndex, setStepIndex] = React.useState(0);
  const [isLoading, setLoading] = React.useState(true);
  const [balance, setBalance] = React.useState<
    { confirmed: number; unconfirmed: number } | undefined
  >();
  const [alias, setAlias] = React.useState<string>();
  const [address, setAddress] = React.useState<string>();
  const [connectPubkey, setConnectPubkey] = React.useState<string>();
  const [connectHost, setConnectHost] = React.useState<string>();
  const [channelOptions, setChannelOptions] = React.useState<RecommendedNode[]>(
    []
  );
  const hiddenChannelOptions = React.useMemo(
    () => RECOMMENDED_NODES.filter((node) => channelOptions.indexOf(node) < 0),
    [channelOptions]
  );

  const [channelOpenTransactionId, setChannelOpenTransactionId] =
    React.useState<string>();

  const MIN_BALANCE = Math.min(...RECOMMENDED_NODES.map((n) => n.min));
  const findConnectableNodes = (amount: number) => {
    return RECOMMENDED_NODES.filter((n) => amount > n.min);
  };

  React.useEffect(() => {
    (async () => {
      async function init() {
        try {
          if (!window.webln?.request) {
            setLoading(false);
            return;
          }
          await window.webln.enable();
          const info: GetInfoResponse = await window.webln.getInfo();
          if (
            info.methods.indexOf("request.walletbalance") < 0 ||
            info.methods.indexOf("request.newaddress") < 0
          ) {
            const isEnabled = await window.webln.isEnabled();
            if (isEnabled) {
              window.webln.on("accountChanged", () => {
                document.location.reload();
              });
            }
            setLoading(false);
            return;
          }
          setAlias(info.node?.alias);
          setStepIndex(1);
          const balanceResponse = await fetchBalance();
          const confirmedBalance = parseInt(balanceResponse.confirmed_balance);
          const nodes = findConnectableNodes(confirmedBalance);
          if (nodes.length > 0) {
            setChannelOptions(nodes);
            setStepIndex(2);
          } else {
            const existingAddress = window.localStorage.getItem("address");
            if (existingAddress) {
              setAddress(existingAddress);
            } else {
              const newaddressResponse = (await window.webln.request(
                "newaddress"
              )) as { address: string };
              setAddress(newaddressResponse.address);
              window.localStorage.setItem(
                "address",
                newaddressResponse.address
              );
            }
          }
        } catch (error) {
          console.error(error);
          setConnectError("Failed to connect to wallet: " + error);
        }
      }
      await init();
      setLoading(false);
    })();
  }, []);

  async function fetchBalance() {
    if (!window.webln?.request) {
      throw new Error("WebLN.request not available");
    }
    const balanceResponse = (await window.webln.request("walletbalance")) as {
      confirmed_balance: string;
      unconfirmed_balance: string;
    };
    setBalance({
      confirmed: parseInt(balanceResponse.confirmed_balance),
      unconfirmed: parseInt(balanceResponse.unconfirmed_balance),
    });
    return balanceResponse;
  }

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
        fund_max: true,
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

  const logos = (
    <div className="mb-8 flex items-center justify-center gap-4">
      <img src={albyImage} className="h-16 w-16 rounded" />
      <p>✗</p>
      <img src={lndImage} className="h-16 w-16 rounded" />
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-start items-center w-full h-full pt-24">
        {logos}
        <h1 className="mt-4 text-lg text-center font-bold">Loading...</h1>
      </div>
    );
  }
  if (connectError) {
    return (
      <div className="flex flex-col justify-center items-center w-full">
        <h1 className="mb-4 text-2xl text-center font-bold">
          Connection Error
        </h1>
        <p>{connectError}</p>
        <p>Please refresh and try again.</p>
      </div>
    );
  }

  return (
    <div
      data-theme="bumblebee"
      className="flex min-h-full w-full items-start justify-center p-8 font-sans"
    >
      <div className="flex w-full max-w-lg flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold">Setup {alias}</h1>
        {logos}
        <div className="mb-8 flex w-full flex-col items-start justify-start rounded-2xl p-4 shadow-lg">
          <h2 className="mt-4 mb-8 text-lg font-semibold text-center w-full">
            {steps[currentStepIndex]}
          </h2>
          {currentStepIndex === 0 && (
            <div className="flex flex-col gap-4">
              <p>This wizard helps you to setup your new LND lightning node!</p>
              <p>
                In 3 steps it helps you to fund your node and open channels to
                send and receive lightning payments.
              </p>
              <p>
                Make sure you have the{" "}
                <a href="https://getalby.com" target="_blank" className="link">
                  Alby extension installed
                </a>{" "}
                and connected to a LND node.
              </p>
              <p>
                To get a voltage cloud node you can{" "}
                <a
                  href="https://info.getalby.com/voltage"
                  target="_blank"
                  className="link"
                >
                  follow our guide
                </a>
                .
              </p>
              <ol className="list-inside list-decimal flex flex-col gap-4 pl-4">
                <li>Install the Alby extension</li>
                <li>
                  Get your lightning node. We currently recommend Voltage cloud
                  to quickly get a cloud hosted node
                </li>
                <li>Connect to your Lightning node from the Alby extension</li>
              </ol>
              <p className="mt-4 italic text-center w-full">
                Once the above steps are done, please refresh this page.
              </p>
            </div>
          )}
          {currentStepIndex === 1 && (
            <>
              <p>
                You currently have <strong>{balance?.confirmed} sats</strong> on
                your onchain wallet.
              </p>
              <p className="mt-4">
                To open a open a lightning channel we recommend at{" "}
                <strong>least {MIN_BALANCE} sats</strong>.
              </p>
              <p className="mt-4">
                Please send sats to your node and wait for one confirmation.
              </p>
              <p className="mt-4">Deposit address:</p>
              <input
                readOnly
                className="input input-bordered mb-4 w-full text-center"
                value={address}
              />

              <p>Confirmed balance: {balance?.confirmed} sats</p>
              <p>Unconfirmed balance: {balance?.unconfirmed} sats</p>

              <p className="mt-4 italic text-center w-full">
                Once completed please refresh this page.
              </p>
            </>
          )}
          {currentStepIndex === 2 && channelOpenTransactionId && (
            <>
              <h3 className="mb-4 font-semibold">Channel opening!</h3>
              <p className="mb-4">
                Please wait for at least <strong>3 confirmations</strong> and
                you'll be able payments with the Alby Extension.
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
          {currentStepIndex === 2 &&
            !channelOpenTransactionId &&
            channelOptions.length > 0 && (
              <>
                <p>
                  Great, you have {balance?.confirmed} sats available to open a
                  new lightning channel.
                </p>
                <p className="mt-4">
                  This channel will initially allow you to <strong>send</strong>{" "}
                  lightning payments.
                </p>
                <p className="mb-4 mt-8 font-semibold">
                  Open a channel with one of our recommended nodes
                </p>
                {hiddenChannelOptions.length > 0 && (
                  <p className="italic text-xs mb-4 w-full text-center">
                    Deposit more sats to unlock {hiddenChannelOptions.length}{" "}
                    more nodes
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {channelOptions.map((node) => (
                    <div
                      key={node.pubkey}
                      className="w-full rounded bg-neutral-100 p-4"
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
                    className="input input-bordered mb-4 w-full text-center"
                    value={connectPubkey}
                    onChange={(e) => setConnectPubkey(e.target.value)}
                    placeholder="node pubkey"
                  />
                  <input
                    className="input input-bordered mb-4 w-full text-center"
                    value={connectHost}
                    onChange={(e) => setConnectHost(e.target.value)}
                    placeholder="node host"
                  />
                  <button
                    className="btn btn-primary btn-lg w-full"
                    onClick={openChannel}
                    disabled={!(connectHost && connectPubkey)}
                  >
                    Open Channel
                  </button>
                  <p className="mt-4 italic">
                    This will connect your node to the peer and open a new
                    lightning channel with the maximum of your available
                    balance.
                  </p>
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
