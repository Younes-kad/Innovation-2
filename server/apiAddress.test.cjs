const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveApiUrl } = require('../shared/apiAddress');
test('native API follows the Expo host instead of pointing at the phone itself', () => {
  for (const platform of ['ios', 'android']) {
    assert.equal(
      resolveApiUrl({ platform, hostUri: '192.168.0.171:8081' }),
      'http://192.168.0.171:3001'
    );
    assert.equal(
      resolveApiUrl({ platform, hostUri: 'exp://192.168.0.172:8081' }),
      'http://192.168.0.172:3001'
    );
    assert.equal(resolveApiUrl({ platform, hostUri: '10.0.2.2:8081' }), 'http://10.0.2.2:3001');
  }
});
test('explicit API URL wins; web uses its own host; missing dev host remains supported', () => {
  assert.equal(
    resolveApiUrl({
      platform: 'ios',
      hostUri: '192.168.0.171:8081',
      override: ' https://api.example.dk/ ',
    }),
    'https://api.example.dk'
  );
  assert.equal(
    resolveApiUrl({ platform: 'web', webOrigin: 'http://localhost:8081' }),
    'http://localhost:3001'
  );
  assert.equal(
    resolveApiUrl({ platform: 'web', webOrigin: 'http://192.168.0.171:8081' }),
    'http://192.168.0.171:3001'
  );
  assert.equal(resolveApiUrl({ platform: 'ios' }), 'http://localhost:3001');
});
