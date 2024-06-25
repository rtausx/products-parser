const Queue = require('bull');
const puppeteer = require('puppeteer');
const Promise = require('bluebird');
const fs = require('fs');
const jsoncsv = require('json-csv')

const scrapeQueue = new Queue('scrapeQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

scrapeQueue.process('scrape', async (job) => {
  testResult = {}
  const { urls, tests } = job.data;
  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
    const totalUrls = urls.length;
    let processedUrls = 0;

    await Promise.map(urls, async (url) => {
      try {
        const page = await browser.newPage();
        await page.setViewport({
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
        });
        page.setDefaultNavigationTimeout(0);
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForFunction('typeof cbar_sid != "undefined" && cbar_sid != 0', { timeout: 0 });
        if (tests) {
          console.log('test defined!')
          let testRun = await evaluateFunction(page, tests);
          console.log(testRun);
          testResult[url] = testRun;
        }
        console.log(JSON.stringify(testResult));
        await page.close();
      } catch (error) {
        console.error(`Error visiting ${url}:`, error);
      }
      processedUrls += 1;
      job.progress(Math.round((processedUrls / totalUrls) * 100)); // Update job progress
    }, { concurrency: 20 });
    if (tests) fs.writeFileSync(`./job_files/${job.id}.json`, JSON.stringify(testResult));
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }

  }
});

async function evaluateFunction(page, tests) {
  try {
    let result = await page.evaluate(tests);
    return result;
  } catch (error) {
    console.error("Error executing function:", error);
    return error;
  }
}

module.exports = scrapeQueue;
