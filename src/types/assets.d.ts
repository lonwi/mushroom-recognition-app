declare module '*.jpg' {
  const value: number;
  export default value;
}

declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.tflite' {
  const assetId: number;
  export = assetId;
}
