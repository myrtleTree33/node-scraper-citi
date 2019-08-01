import util from 'util';

import { scrapeOffers } from './lib/fetcher';

(async () => {
  const results = await scrapeOffers({ page: 2 });
  console.dir(results);
  //   console.log(util.inspect(results, false, null, true /* enable colors */));
  //   console.log(results.length);
})();

const CitiScraper = { scrapeOffers };

export default CitiScraper;
