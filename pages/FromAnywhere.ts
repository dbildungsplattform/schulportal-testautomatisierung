import { Page } from '@playwright/test';
import { trackCreatedEntities } from '../base/utils/testDataLedger';
import { LandingViewPage } from './LandingView.page';

function FromAnywhere(page: Page): { start: () => Promise<LandingViewPage> } {
  return {
    async start(): Promise<LandingViewPage> {
      trackCreatedEntities(page);
      await page.goto('/', { waitUntil: 'load' });
      try {
        const landingPage: LandingViewPage = await new LandingViewPage(page).waitForPageLoad();
        return landingPage;
      } catch (error) {
        console.log('Reloading page due to error in loading landing page:', error);
        await page.reload();
        return new LandingViewPage(page).waitForPageLoad();
      }
    },
  };
}

export default FromAnywhere;
