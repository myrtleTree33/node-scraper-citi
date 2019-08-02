import Axios from 'axios';
import Cheerio from 'cheerio';
import moment from 'moment';

const expandResults = results => {
  const expandedResults = [];
  for (let i = 0; i < results.length; i++) {
    const curr = results[i];
    const { id } = curr;
    const currCopy = { ...curr };
    delete currCopy.outlets;

    // Expand outlets if there are
    if (curr.outlets && curr.outlets.length > 0) {
      curr.outlets.map(outlet => {
        const { address, telephone, loc } = outlet;
        const title = `${currCopy.title} - ${address.split(',')[0]}`;
        const idComposed = `${id}-${title.replace(/\s/g, '-')}`;

        expandedResults.push({
          ...currCopy,
          id: idComposed,
          title,
          address,
          telephone,
          loc
        });
      });
    }
    expandedResults.push(currCopy);
  }

  return expandedResults;
};

const processOutlet = ($, elem) => {
  const address = ($('div.location-details__address', elem).text() || '')
    .replace(/\s+/g, ' ')
    .replace(/Singapore - /, ', Singapore ')
    .trim();

  const telephone = $(
    'div.location-details__contact > a:nth-child(1) > span',
    elem
  )
    .text()
    .replace(/\s+/g, '')
    .replace(/Phone:/, '');

  return { address, telephone };
};

const scrapeDetails = async link => {
  const res = await Axios.get(link);
  const $ = Cheerio.load(res.data);

  const imgUrls = [
    $(
      '#app > section:nth-child(3) > div > div > div > div.grid-xxs-12.grid-sm-6.grid-offer-media > figure > div > img'
    ).attr('src')
  ];

  const tokens = link.split('/');
  const id = tokens[tokens.length - 1];

  const address = (
    $(
      '#app > section:nth-child(4) > div > div > div > div > div.grid-xxs-12.grid-sm-6.grid-offer-location-details > div > div.location-details__address'
    ).text() || ''
  )
    .replace(/\s+/g, ' ')
    .replace(/Singapore - /, ', Singapore ')
    .trim();

  const tos = $(
    '#app > section:nth-child(3) > div > div > div > div.grid-xxs-12.grid-sm-6.grid-offer-details > div > div.offer-details__footer > div.tnc-block > div'
  )
    .text()
    .split('- ')
    .map(s => s.trim())
    .filter(Boolean);

  const locs = [];
  try {
    const lat = $('body')
      .html()
      .match(/latitude":([0-9]*\.[0-9]*),"/g)
      .map(m => m.match(/\d+\.\d+/)[0]);

    const lng = $('body')
      .html()
      .match(/longtitude":([0-9]*\.[0-9]*),"/g)
      .map(m => m.match(/\d+\.\d+/)[0]);

    for (let i = 0; i < lat.length; i++) {
      locs.push([parseFloat(lng[i], 10), parseFloat(lat[i], 10)]);
    }
  } catch (e) {}

  const outlets = $(
    '#app > section:nth-child(4) > div > div > div > div:nth-child(2) > div.offer-location-more > div > div'
  )
    .map((i, elem) => processOutlet($, elem))
    .get();

  for (let i = 0; i < outlets.length; i++) {
    outlets[i] = { ...outlets[i], loc: locs[i + 1] };
  }

  const telephone = $(
    '#app > section:nth-child(4) > div > div > div > div > div.grid-xxs-12.grid-sm-6.grid-offer-location-details > div > div.location-details__contact > a:nth-child(1) > span'
  )
    .text()
    .replace(/\s+/g, '')
    .replace(/Phone:/, '');

  const details = $(
    '#app > section:nth-child(3) > div > div > div > div.grid-xxs-12.grid-sm-6.grid-offer-details > div > div.offer-details__header > h3'
  ).text();

  let discountPercent = details.match(/(.*)%/);
  discountPercent = discountPercent ? parseInt(discountPercent, 10) : null;
  discountPercent = discountPercent ? discountPercent : null; // for NaN

  let returnVoucherAmount = details.match(/SGD(.*) return voucher/i);
  returnVoucherAmount = returnVoucherAmount ? returnVoucherAmount[1] : null;

  const isOneForOne = /1-for-1/.test(details);

  const hasFreeStuff = /Complimentary/i.test(details);

  let minPax = details.match(/(\s*[0-9]+)([ |,]*)/g);

  let dateEnd = $(
    '#app > section:nth-child(3) > div > div > div > div.grid-xxs-12.grid-sm-6.grid-offer-details > div > p'
  ).text();
  dateEnd = dateEnd.match(/till: (.*)/);
  dateEnd = dateEnd && dateEnd.length > 1 ? dateEnd[1] : null;
  dateEnd = moment(dateEnd, 'LL').toDate();

  return {
    id,
    imgUrls,
    address,
    telephone,
    discountPercent,
    details,
    isOneForOne,
    dateEnd,
    loc: locs[0],
    outlets,
    tos,
    returnVoucherAmount,
    hasFreeStuff
  };
};

const processResult = async ($, elem) => {
  const title = $('a > div > h4', elem).text();
  const link = $('a', elem).attr('href');
  const tags = [$('a > div > div > p.card__subcategory', elem).text()];

  // Skip in the case of dead link
  if (!link) {
    return Promise.resolve({});
  }
  const details = await scrapeDetails(link);
  return { title, link, tags, ...details };
};

export const scrapeOffers = async (
  opts = {
    page: 1
  }
) => {
  const { page } = opts;

  const url = `https://www.citiworldprivileges.com/sg-singapore/restaurants-offers-4?page=${page}&hotdeals=301959,302381&icid=SGENCBLMSCATLViewDetailsGOFO`;
  const res = await Axios.get(url);
  const $ = Cheerio.load(res.data);

  let outletPromises = $('#offers-wrap > div')
    .map((i, elem) => processResult($, elem))
    .get();

  outletPromises =
    outletPromises.length > 0
      ? outletPromises.splice(0, outletPromises.length - 1)
      : [];

  // Normalize and expand outlets if there are
  const results = await Promise.all(outletPromises);
  return Promise.resolve(expandResults(results));
};

export const scrapeEntry = async (opts = { url: undefined }) => {};
