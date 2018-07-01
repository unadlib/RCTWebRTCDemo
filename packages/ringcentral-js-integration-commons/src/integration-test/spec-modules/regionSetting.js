import { ensureLogin } from '../utils/HelpUtil';
import { waitInSeconds } from '../utils/WaitUtil';
import ClientHistoryRequest from '../utils/ClientHistoryRequest';
import * as mock from '../mock';

export default (auth, client, regionSettings, account) => {
  describe('Should Load Region Settings after Login', function () {
    this.timeout(20000);
    mock.mockClient(client);
    let isLoginSuccess;
    const clientHistoryRequest = new ClientHistoryRequest(new Map(), client);
    before(async function () {
      mock.mockForLogin();
      isLoginSuccess = await ensureLogin(auth, account);
      if (!isLoginSuccess) {
        console.error('Skip test case as failed to login with credential ', account);
        this.skip();
      }
    });

    it('Region Settings should be ready in 2 seconds after login', async () => {
      this.retries(2);
      await waitInSeconds(2);
      expect(regionSettings.availableCountries).to.have.length.above(0);
    });

    it('Record fetched from SDK should be the same as RawData', () => {
      expect(regionSettings.availableCountries.length).to.equal(clientHistoryRequest.getRawResponse(ClientHistoryRequest.endPoints.dialingPlan).records.length);
    });
  });
};
