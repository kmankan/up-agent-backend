// generate-key.ts
import crypto from 'crypto';

const generatedKey = crypto.randomBytes(32);
const base64Key = generatedKey.toString('base64');
console.log('Your ENCRYPTION_KEY:', base64Key);