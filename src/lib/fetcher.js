import Axios from 'axios';
import Cheerio from 'cheerio';

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

  let tos = $('#tnc > div > ul > li > strong')
    .map((i, elem) => $(elem).text())
    .get();

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
      locs.push([lng[i], lat[i]]);
    }
  } catch (e) {}

  const telephone = $(
    '#app > section:nth-child(4) > div > div > div > div > div.grid-xxs-12.grid-sm-6.grid-offer-location-details > div > div.location-details__contact > a:nth-child(1) > span'
  )
    .text()
    .replace(/\s+/g, '')
    .replace(/Phone:/, '');

  return {
    id,
    imgUrls,
    address,
    locs,
    telephone
    // maxPax,
    // daysExpiry,
    // minPrice,
    // maxPrice,
    // maxDiscount,
    // offers,
    // availableOffers,
    // tos
  };
};

const processResult = async ($, elem) => {
  const title = $('a > div > h4', elem).text();
  const link = $('a', elem).attr('href');
  const tags = [$('a > div > div > p.card__subcategory', elem).text()];
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

  let results = $('#offers-wrap > div')
    .map((i, elem) => processResult($, elem))
    .get();

  results = results.length > 0 ? results.splice(0, results.length - 1) : [];

  return Promise.all(results);
};

export const scrapeEntry = async (opts = { url: undefined }) => {};
