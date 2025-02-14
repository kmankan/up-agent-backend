import express from 'express';
import  CallFromBland from '../lib/bland-agent';

const router = express.Router();

router.post('/call', async (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  console.log('Phone number:', phoneNumber);
  const initiateCall = await CallFromBland(phoneNumber);
  res.status(200).json({
    message: `Call from Bland created with id: ${initiateCall.call_id}`,
    response: initiateCall
  });
  console.log('Bland call created:', initiateCall);
});

export { router as blandRouter };