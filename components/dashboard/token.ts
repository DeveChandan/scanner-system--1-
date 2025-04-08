// pages/api/token.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tokenId = '2025-M251-0001113671'; // Optionally, read from req.query for dynamic tokens.
    const url = `https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/TokenDetailsSet('${tokenId}')?$expand=getloadingsequence`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('VERTIF_01:EmamiWM@Qas24').toString('base64'),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'sap-client': '300'
      }
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
