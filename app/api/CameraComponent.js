import React, { useRef, useState } from 'react';
import Camera from 'react-camera-pro';
import { Button, Box } from '@mui/material';
import { storage, db } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';

const CameraComponent = () => {
  const camera = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  const captureImage = () => {
    const photo = camera.current.takePhoto();
    setImage(photo);
  };

  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    try {
      const blob = dataURItoBlob(image);
      const storageRef = ref(storage, `images/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(storageRef);

      // Save image URL to Firestore
      await addDoc(collection(db, 'images'), {
        url: imageUrl,
        createdAt: new Date()
      });

      // Use OpenAI API to analyze the image
      const aiResponse = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      const result = await aiResponse.json();
      setAnalysisResult(result);
    } catch (error) {
      console.error('Error analyzing image:', error);
      setAnalysisResult('Error analyzing image');
    } finally {
      setLoading(false);
    }
  };

  const dataURItoBlob = (dataURI) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  return (
    <Box>
      <Camera ref={camera} aspectRatio={16 / 9} />
      <Button variant='outlined' onClick={captureImage}>
        Capture
      </Button>
      <Button variant='outlined' onClick={analyzeImage} disabled={!image || loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </Button>
      {image && (
        <Box>
          <img src={image} alt='Captured' style={{ width: '100%' }} />
        </Box>
      )}
      {analysisResult && (
        <Box>
          <p>Analysis Result: {analysisResult}</p>
        </Box>
      )}
    </Box>
  );
};

export default CameraComponent;
