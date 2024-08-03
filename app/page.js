'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Container, TextField, Button, List, ListItem, ListItemText, IconButton, Typography, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import {Camera} from 'react-camera-pro';
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { capitalize } from 'lodash';

const base64ToBlob = (base64, mime) => {
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Invalid base64 string');
  }
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: mime });
};

const PantryTracker = () => {
  const [itemName, setItemName] = useState('');
  const [items, setItems] = useState([]);
  const [image, setImage] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const fetchItems = async () => {
    const querySnapshot = await getDocs(collection(db, 'pantryItems'));
    const itemsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setItems(itemsList);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = async () => {
    if (itemName.trim() !== '') {
      const capitalizedItemName = capitalize(itemName.trim());
      const pantryRef = collection(db, 'pantryItems');
      const querySnapshot = await getDocs(pantryRef);

      const existingItemDoc = querySnapshot.docs.find(doc => doc.data().name === capitalizedItemName);
      
      if (existingItemDoc) {
        const itemRef = doc(db, 'pantryItems', existingItemDoc.id);
        const currentQuantity = existingItemDoc.data().quantity || 0;
        await updateDoc(itemRef, { quantity: currentQuantity + 1 });
        setItems(items.map(item =>
          item.id === existingItemDoc.id
            ? { ...item, quantity: currentQuantity + 1 }
            : item
        ));
      } else {
        const docRef = await addDoc(pantryRef, { name: capitalizedItemName, quantity: 1 });
        setItems([...items, { id: docRef.id, name: capitalizedItemName, quantity: 1 }]);
      }
      
      setItemName('');
    }
  };

  const handleDeleteItem = async (id) => {
    const itemToDelete = items.find(item => item.id === id);
    
    if (itemToDelete) {
      if (itemToDelete.quantity > 1) {
        const itemRef = doc(db, 'pantryItems', id);
        await updateDoc(itemRef, { quantity: itemToDelete.quantity - 1 });
        setItems(items.map(item =>
          item.id === id
            ? { ...item, quantity: itemToDelete.quantity - 1 }
            : item
        ));
      } else {
        await deleteDoc(doc(db, 'pantryItems', id));
        setItems(items.filter(item => item.id !== id));
      }
    }
  };

  const handleCapture = (dataUri) => {
    if (typeof dataUri !== 'string') {
      console.error('Invalid data URI');
      return;
    }
    // Extract mime type from data URI
    const mime = dataUri.split(';')[0].split(':')[1];
    // Convert base64 data to blob
    try {
      const blob = base64ToBlob(dataUri, mime);
      setImage(blob);
      setCameraOpen(false);
    } catch (error) {
      console.error('Error converting base64 to blob:', error);
    }
  };
  

  const handleImageUpload = async () => {
    if (image) {
      const storage = storage();
      const storageRef = ref(storage, 'images/my-photo.jpg');

      try {
        await uploadBytes(storageRef, image);
        console.log('Image uploaded successfully');

        // Optionally, send image to OpenAI API
        const formData = new FormData();
        formData.append('file', image);
        const response = await fetch('/api/processImage', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error('Image upload failed');
        }

        const data = await response.json();
        const itemsFromImage = data.items;
        const capitalizedItems = itemsFromImage.map(item => capitalize(item));

        for (const item of capitalizedItems) {
          const querySnapshot = await getDocs(collection(db, 'pantryItems'));
          const existingItemDoc = querySnapshot.docs.find(doc => doc.data().name === item);

          if (existingItemDoc) {
            const itemRef = doc(db, 'pantryItems', existingItemDoc.id);
            const currentQuantity = existingItemDoc.data().quantity || 0;
            await updateDoc(itemRef, { quantity: currentQuantity + 1 });
            setItems(items.map(i =>
              i.id === existingItemDoc.id
                ? { ...i, quantity: currentQuantity + 1 }
                : i
            ));
          } else {
            const docRef = await addDoc(collection(db, 'pantryItems'), { name: item, quantity: 1 });
            setItems([...items, { id: docRef.id, name: item, quantity: 1 }]);
          }
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim() !== '') {
      const capitalizedQuery = capitalize(searchQuery.trim());
      const querySnapshot = await getDocs(collection(db, 'pantryItems'));
      const searchItem = querySnapshot.docs.find(doc => doc.data().name === capitalizedQuery);

      if (searchItem) {
        const quantity = searchItem.data().quantity || 0;
        setSearchResult({
          name: searchItem.data().name,
          quantity,
        });
      } else {
        setSearchResult({
          name: searchQuery,
          quantity: 0,
        });
      }
      setSearchQuery('');
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#e8f5e9',
      }}
    >
      <Box
        my={4}
        width="100%"
        maxWidth="md"
        sx={{
          padding: 4,
          borderRadius: 2,
          boxShadow: 3,
          backgroundColor: '#c8e6c9',
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom textAlign="center" sx={{ mb: 3 }}>
          Pantry Tracker
        </Typography>
        <TextField
          label="Add Pantry Item"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#a5d6a7',
              },
              '&:hover fieldset': {
                borderColor: '#4caf50',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#388e3c',
              },
            },
            '& .MuiInputLabel-root': {
              color: '#4caf50',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#388e3c',
            },
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddItem}
          fullWidth
          sx={{
            mb: 3,
            background: 'linear-gradient(to right, #66bb6a, #43a047)',
            '&:hover': {
              background: 'linear-gradient(to right, #43a047, #66bb6a)',
            },
          }}
        >
          Add Item
        </Button>
        <TextField
          label="Search Pantry Item"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#a5d6a7',
              },
              '&:hover fieldset': {
                borderColor: '#4caf50',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#388e3c',
              },
            },
            '& .MuiInputLabel-root': {
              color: '#4caf50',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#388e3c',
            },
          }}
        />
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSearch}
          fullWidth
          sx={{
            mb: 3,
            background: 'linear-gradient(to right, #81c784, #66bb6a)',
            '&:hover': {
              background: 'linear-gradient(to right, #66bb6a, #81c784)',
            },
          }}
        >
          Search Item
        </Button>
        {searchResult && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {searchResult.quantity === 0 ? (
              <Typography variant="h6" color="error">
                No item found.
              </Typography>
            ) : (
              <Typography variant="h6" color="olivegreen">
                {searchResult.quantity === 1
                  ? `There is one ${searchResult.name} in your pantry.`
                  : `There are ${searchResult.quantity} ${searchResult.name}s in your pantry.`}
              </Typography>
            )}
          </Box>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={() => setCameraOpen(true)}
          fullWidth
          sx={{
            mb: 3,
            background: 'linear-gradient(to right, #66bb6a, #43a047)',
            '&:hover': {
              background: 'linear-gradient(to right, #43a047, #66bb6a)',
            },
          }}
        >
          Open Camera
        </Button>
        {cameraOpen && (
          <Box sx={{ position: 'relative', textAlign: 'center' }}>
            <Camera
              ref={Camera}
              aspectRatio={16 / 9}
              sx={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                border: '2px solid #66bb6a',
                borderRadius: '10px',
              }}
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={handleCapture}
              sx={{
                mt: 2,
                background: 'linear-gradient(to right, #e57373, #f44336)',
                '&:hover': {
                  background: 'linear-gradient(to right, #f44336, #e57373)',
                },
              }}
            >
              Capture Photo
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setCameraOpen(false)}
              sx={{
                mt: 2,
                background: 'linear-gradient(to right, #e57373, #f44336)',
                '&:hover': {
                  background: 'linear-gradient(to right, #f44336, #e57373)',
                },
              }}
            >
              Close Camera
            </Button>
          </Box>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleImageUpload}
          fullWidth
          sx={{
            mt: 2,
            background: 'linear-gradient(to right, #66bb6a, #43a047)',
            '&:hover': {
              background: 'linear-gradient(to right, #43a047, #66bb6a)',
            },
          }}
        >
          Upload Image
        </Button>
        <List sx={{ mt: 3 }}>
          {items.map(item => (
            <ListItem key={item.id} secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteItem(item.id)}>
                <DeleteIcon />
              </IconButton>
            }>
              <ListItemText primary={`${item.name} - ${item.quantity}`} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Container>
  );
};

export default PantryTracker;




