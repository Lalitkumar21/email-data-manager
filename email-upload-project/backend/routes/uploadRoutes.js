const express = require('express');
const multer = require('multer');
const UploadController = require('../controllers/uploadController');

const router = express.Router();
const uploadController = new UploadController();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Specify the upload directory
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Use original file name
    }
});

const upload = multer({ storage: storage });

// Define the upload route
router.post('/upload', upload.single('file'), (req, res) => {
    uploadController.uploadFile(req, res);
});

module.exports = router;