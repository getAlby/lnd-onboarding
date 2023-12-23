import { Buffer } from "buffer";

//https://stackoverflow.com/a/41797377/4562693
export function hexToBase64(hexstring: string) {
  return btoa(
    hexstring
      .match(/\w{2}/g)!
      .map(function (a) {
        return String.fromCharCode(parseInt(a, 16));
      })
      .join("")
  );
}

const swapEndianness = (string: string) => {
  const result = [];
  let len = string.length - 2;

  while (len >= 0) {
    result.push(string.substring(len, len + 2));
    len -= 2;
  }
  return result.join("");
};

export const getTransactionId = (transactionIdBytes: string): string => {
  const buffer = Buffer.from(transactionIdBytes, "base64");
  const hex = buffer.toString("hex");
  const transactionId = swapEndianness(hex);

  return transactionId;
};
