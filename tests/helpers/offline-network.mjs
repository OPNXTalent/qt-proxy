// Test processes may install their own fetch mocks. A missing mock must never
// send inherited credentials or make a live provider/database request.
const fetchLocal = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('OFFLINE_TEST_NETWORK_REQUEST_BLOCKED');
  }
  return fetchLocal(input, init);
};
