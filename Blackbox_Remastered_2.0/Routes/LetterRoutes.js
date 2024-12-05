
const express = require('express');
const multer = require('multer');
const ImageKit = require('imagekit');
const LetterTemplate = require('../Models/Letter_template'); // Import LetterTemplate model and sequelize instance
const sequelize = require('../config/database'); // Adjust the path as needed
const router = express.Router();

// Initialize ImageKit
const imagekit = new ImageKit({
    publicKey: "public_UCxvoHx58ajkX85Q6oBFCP7pSuI=",
    privateKey: "private_ATOOFtW1RZ2IoJWSF41Jbu46lDM=",
    urlEndpoint: "https://ik.imagekit.io/blackboxv2",
});

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to delete the old image from ImageKit
async function deleteOldImage(fileId) {
    if (!fileId) return;
    try {
        await imagekit.deleteFile(fileId); // Deletes the old image using fileId
    } catch (error) {
        console.error('Error deleting old image:', error);
    }
}


// Create or Update Letter Template with ImageKit fileId
router.post('/letter-template', upload.single('signature_image'), async (req, res) => {
    let transaction;

    try {
        const {
            template_id, // If provided, it indicates an edit; if not, it's a new entry
            template_name,
            template_subject,
            template_body
        } = req.body;

        let signature_url = null;
        let signature_file_id = null; // To store ImageKit fileId for future deletions

        // Start a transaction
        transaction = await sequelize.transaction();

        // Check if a new signature image is provided
        if (req.file) {
            if (template_id) {
                const existingTemplate = await LetterTemplate.findByPk(template_id, { transaction });
                if (existingTemplate && existingTemplate.signature_file_id) {
                    await deleteOldImage(existingTemplate.signature_file_id); // Delete old image using fileId
                }
            }

            // Convert the uploaded file to base64 for ImageKit
            const encodedImage = req.file.buffer.toString('base64');

            // Upload the new image to ImageKit
            const uploadResponse = await imagekit.upload({
                file: encodedImage,
                fileName: `${template_name}_signature`,
                folder: '/signature-documents',
            });

            signature_url = uploadResponse.url;
            signature_file_id = uploadResponse.fileId; // Store ImageKit fileId
        }

        if (template_id) {
            const template = await LetterTemplate.findByPk(template_id, { transaction });
            if (!template) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Template not found' });
            }

            await template.update(
                {
                    template_name,
                    template_subject,
                    template_body,
                    signature_url: signature_url || template.signature_url,
                    signature_file_id: signature_file_id || template.signature_file_id,
                },
                { transaction }
            );

            await transaction.commit();
            return res.status(200).json({ message: 'Template updated successfully', template });
        }

        const newTemplate = await LetterTemplate.create(
            {
                template_name,
                template_subject,
                template_body,
                signature_url,
                signature_file_id,
            },
            { transaction }
        );

        await transaction.commit();
        return res.status(201).json({ message: 'Template created successfully', newTemplate });

    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error(error);
       
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



// Fetch all letter templates
router.get('/fetchallletters', async (req, res) => {
    try {
        const templates = await LetterTemplate.findAll({
            attributes: ['template_id', 'template_name', 'template_subject', 'createdAt', 'updatedAt'],
        });
        res.status(200).json(templates);
    } catch (error) {
        console.error('Error fetching letter templates:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// Duplicate a letter template
router.post('/duplicate-letter-template', async (req, res) => {
    const { template_id } = req.body;
    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        const existingTemplate = await LetterTemplate.findByPk(template_id, { transaction });

        if (!existingTemplate) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Template not found' });
        }

        const duplicatedTemplate = await LetterTemplate.create(
            {
                template_name: `${existingTemplate.template_name} copy`,
                template_subject: existingTemplate.template_subject,
                template_body: existingTemplate.template_body,
                signature_url: null, // Exclude signature details for the duplicated template
                signature_file_id: null,
            },
            { transaction }
        );

        // Commit the transaction
        await transaction.commit();

        return res.status(201).json({
            message: 'Template duplicated successfully',
            duplicatedTemplate,
        });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error(error);
       
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// Delete a letter template
router.delete('/letter-template-delete', async (req, res) => {
    const { template_id } = req.body;
    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        const existingTemplate = await LetterTemplate.findByPk(template_id, { transaction });

        if (!existingTemplate) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Template not found' });
        }

        // Delete associated image if it exists
        if (existingTemplate.signature_file_id) {
            try {
                await imagekit.deleteFile(existingTemplate.signature_file_id);
            } catch (imageError) {
                console.error('Error deleting image from ImageKit:', imageError);

                // Rollback transaction on ImageKit deletion error
                await transaction.rollback();
                return res.status(500).json({ message: 'Error deleting image from ImageKit' });
            }
        }

        // Delete the template
        await existingTemplate.destroy({ transaction });

        // Commit the transaction
        await transaction.commit();

        return res.status(200).json({ message: 'Template and associated image deleted successfully' });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error(error);
       
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



// Fetch a letter template by ID
router.get('/viewallletters/:template_id', async (req, res) => {
    try {
        const { template_id } = req.params;

        const template = await LetterTemplate.findOne({
            where: { template_id }
        });

        if (!template) {
            return res.status(404).json({ message: 'Letter template not found' });
        }

        res.status(200).json(template);

    } catch (error) {
        console.error('Error fetching letter template:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
module.exports = router;