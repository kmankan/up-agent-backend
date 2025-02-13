
type CallFromBlandResponse = {
  status: string;
  message: string;
  call_id: string;
  batch_id: string | null;
}


const CallFromBland = async (phoneNumber: string): Promise<CallFromBlandResponse> => {
  
const getPhoneNumber = phoneNumber;
  // Headers  
const headers = {
  'authorization': process.env.BLAND_API_KEY || '',
  'Content-Type': 'application/json'
};
// Data
const data = {
 "phone_number": getPhoneNumber,
 "voice": "daisy",
 "pathway_id": "a17e84ac-e9bd-490c-b1c7-858554ee4ec3",
 "local_dialing": false,
 "max_duration": 12,
 "answered_by_enabled": false,
 "wait_for_greeting": false,
 "noise_cancellation": false,
 "record": false,
 "amd": false,
 "interruption_threshold": 100,
 "voicemail_message": null,
 "temperature": 0.6,
 "webhook": "https://webhook.site/4f9b3360-9a04-4373-b9f1-4999d2696813",
 "metadata": null,
 "pronunciation_guide": [
   {
     "word": "1,000,000",
     "pronunciation": "one million",
     "case_sensitive": false,
     "spaced": false
   },
   {
     "word": "6.00%",
     "pronunciation": "six point zero zero percent",
     "case_sensitive": false,
     "spaced": false
   }
 ],
 "start_time": null,
 "background_track": "none",
 "timezone": "Australia/Sydney"
}
  
  // API request
  const response = await fetch('https://api.bland.ai/v1/calls', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  });
  const callData = await response.json() as CallFromBlandResponse;
  return callData;
}

export default CallFromBland;