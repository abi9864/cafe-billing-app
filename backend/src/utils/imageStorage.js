const fs = require('fs');
const path = require('path');

const useGCS = !!process.env.GCS_BUCKET_NAME;

let storageClient = null;
let bucket = null;
if (useGCS) {
  const { Storage } = require('@google-cloud/storage');
  storageClient = new Storage();
  bucket = storageClient.bucket(process.env.GCS_BUCKET_NAME);
}

const saveUploadedImage = async (file, subfolder = 'menu') => {
  if (!file) return null;

  if (useGCS) {
    const filename = `${subfolder}/item_${Date.now()}${path.extname(file.originalname)}`;
    const blob = bucket.file(filename);
    await blob.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false
    });
    return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`;
  }

  return `/uploads/${subfolder}/${file.filename}`;
};

module.exports = { useGCS, saveUploadedImage };
