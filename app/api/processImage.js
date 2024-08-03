
import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

const processImage = async (req, res) => {
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(500).json({ error: 'Error parsing the files' });
        return;
      }

      const file = files.file;
      const filePath = file.filepath;

      // Read the file contents as a buffer
      const fileBuffer = fs.readFileSync(filePath);

      // Send the file buffer to the OpenAI API
      try {
        const response = await fetch('https://api.openai.com/v1/images/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          },
          body: fileBuffer,
        });

        if (!response.ok) {
          throw new Error('Failed to process image with OpenAI API');
        }

        const data = await response.json();
        const itemsFromImage = data.items || []; // Adjust based on actual API response

        res.status(200).json({ items: itemsFromImage });
      } catch (error) {
        res.status(500).json({ error: 'Error processing image with OpenAI API', details: error.message });
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default processImage;



