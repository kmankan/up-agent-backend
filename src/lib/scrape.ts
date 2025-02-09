import puppeteer from 'puppeteer';
import type { Page, Browser } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { setTimeout } from 'timers/promises';

interface Url {
  loc: string[];
  changefreq: string[];
}

interface SitemapData {
  urlset: {
    url: Url[];
  };
}

async function extractTextContent(page: Page): Promise<string> {
  return page.evaluate(() => {
    // Remove script and style elements
    const scripts = document.getElementsByTagName('script');
    const styles = document.getElementsByTagName('style');
    
    Array.from(scripts).forEach(script => script.remove());
    Array.from(styles).forEach(style => style.remove());

    // Get text from main content areas
    const mainContent = document.querySelector('main');
    const articleContent = document.querySelector('article');
    const content = mainContent || articleContent;

    if (!content) {
      return document.body.innerText;
    }

    return content.innerText;
  });
}

async function scrapePage(url: string, browser: Browser): Promise<string | null> {
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const content = await extractTextContent(page);
    return content;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  } finally {
    await page.close();
  }
}

async function scrapeWebsite() {
  // Parse sitemap
  const sitemapXml = await fs.readFile('sitemap.xml', 'utf-8');
  const sitemap = await parseStringPromise(sitemapXml) as SitemapData;
  const urls = sitemap.urlset.url.map(u => u.loc[0]);

  // Create output directory
  const outputDir = path.join(process.cwd(), 'scraped_content');
  await fs.mkdir(outputDir, { recursive: true });

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true
  });

  try {
    for (const url of urls) {
      const filename = url
        .replace('https://up.com.au/', '')
        .replace(/\//g, '_') || 'index';
      
      console.log(`Scraping ${url}...`);
      
      const content = await scrapePage(url, browser);
      
      if (content) {
        const filePath = path.join(outputDir, `${filename}.txt`);
        await fs.writeFile(filePath, content, 'utf-8');
        console.log(`Saved content to ${filePath}`);
      }

      // Rate limiting
      await setTimeout(1000);
    }
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeWebsite().catch(console.error);