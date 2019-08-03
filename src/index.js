import util from 'util';

import { scrapeOffers } from './lib/fetcher';

// (async () => {
//   const results = await scrapeOffers({ page: 1 });
//   // console.dir(results);
//   console.log(util.inspect(results, false, null, true /* enable colors */));
//   console.log(results.length);

//   results.map(r => console.log(r.details));

//   results.map(r => console.log(r.minPax));
// })();

const CitiScraper = { scrapeOffers };

export default CitiScraper;
