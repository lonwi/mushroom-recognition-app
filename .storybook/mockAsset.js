class Asset {
  localUri = 'file:///mock/attributions.jsonl';
  uri = 'file:///mock/attributions.jsonl';
  downloaded = true;
  downloadAsync() {
    return Promise.resolve(this);
  }
  static fromModule() {
    return new Asset();
  }
  static fromURI() {
    return new Asset();
  }
}

export { Asset };
