import { Transaction } from "../types";
import { writeFile } from 'fs/promises';

async function getLastYearTransactions(accessToken: string): Promise<Transaction[]> {
  // Calculate date from 1 year ago
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // Format date according to rfc-3339 and encode it for URL
  const sinceDate = encodeURIComponent(oneYearAgo.toISOString().replace('.000Z', '+10:00'));
  
  // Construct initial URL with date filter and page size
  const baseUrl = `https://api.up.com.au/api/v1/transactions?filter[since]=${sinceDate}&page[size]=100`;
  
  let allTransactions: Transaction[] = [];
  let nextPageUrl = baseUrl;
  let pageCount = 0;

  console.log(`Fetching transactions since: ${decodeURIComponent(sinceDate)}`);

  while (nextPageUrl) {
    try {
      const response = await fetch(nextPageUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}\n` +
          `Error details: ${JSON.stringify(errorData, null, 2)}`
        );
      }

      const data = await response.json();
      allTransactions = allTransactions.concat(data.data);
      nextPageUrl = data.links.next;
      pageCount++;
      
      console.log(`Retrieved page ${pageCount} with ${data.data.length} transactions`);
      
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('Error fetching transactions:', error);
      break;
    }
  }

  try {
    await writeFile(
      'transactions.json', 
      JSON.stringify(allTransactions, null, 2),
      'utf-8'
    );
    console.log('Transactions written to transactions.json');
  } catch (error) {
    console.error('Error writing transactions to file:', error);
  }

  return allTransactions;
}

const transactions = await getLastYearTransactions(process.env.UP_ACCESS_TOKEN || '');
console.log(`Retrieved total of ${transactions.length} transactions`);