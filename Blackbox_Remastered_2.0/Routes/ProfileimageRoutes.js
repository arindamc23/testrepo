const express = require('express');
const multer = require('multer');
const ProfileImage = require('../Models/ProfileImage');
const sequelize = require('../config/database'); // Sequelize instance
const ImageKit = require('imagekit');
const {authenticateToken} = require('../middleware/authMiddleware');
const router = express.Router();

// Initialize ImageKit
const imagekit = new ImageKit({
    publicKey: "public_UCxvoHx58ajkX85Q6oBFCP7pSuI=",
    privateKey: "private_ATOOFtW1RZ2IoJWSF41Jbu46lDM=",
    urlEndpoint: "https://ik.imagekit.io/blackboxv2",
  });
  
  // Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Route to upload or update a profile image for a user
router.post('/upload-or-update-profile-image/:userId', upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    // Check if a profile image already exists for the user
    const existingProfileImage = await ProfileImage.findOne({ where: { user_id: userId } });

    // If an image already exists, delete it from ImageKit using fileId
    if (existingProfileImage) {
      const fileId = existingProfileImage.imagekit_file_id; // Use the stored fileId for deletion
      
      if (fileId) {
        await imagekit.deleteFile(fileId); // Deletes the old image from ImageKit
      }
    }

    // Convert the uploaded file to base64 for ImageKit
    const encodedImage = file.buffer.toString('base64');

    // Upload the new image to ImageKit
    const uploadResponse = await imagekit.upload({
      file: encodedImage,
      fileName: file.originalname,
      folder: '/profile-images',
    });

    // If it's an update, update the record, otherwise create a new record
    const profileImageData = {
      image_url: uploadResponse.url,
      imagekit_file_id: uploadResponse.fileId, // Store fileId for future deletion
      user_id: userId,
    };

    if (existingProfileImage) {
      await ProfileImage.update(profileImageData, { where: { user_id: userId } });
    } else {
      await ProfileImage.create(profileImageData);
    }

    res.status(200).json({
      message: 'Profile image uploaded/updated successfully!',
      imageUrl: uploadResponse.url,
    });

  } catch (error) {
    console.error('Error uploading/updating profile image:', error);
    res.status(500).json({ message: 'Profile image upload/update failed.', error });
  }
});


// Route to fetch the profile image URL for a user
router.get('/profile-image/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if a profile image exists for the user
    const profileImage = await ProfileImage.findOne({ where: { user_id: userId } });

    if (!profileImage) {
      return res.status(204).end(); // 204 No Content
    }

    // Send the image URL back in the response
    res.status(200).json({
      message: 'Profile image fetched successfully!',
      imageUrl: profileImage.image_url,
    });
  } catch (error) {
    console.error('Error fetching profile image:', error);
    res.status(500).json({ message: 'Failed to fetch profile image.', error });
  }
});



module.exports = router;