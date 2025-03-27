const {v4: uuidv4} = require("uuid");

const TABLE_NAME = process.env.DYNAMODB_TABLE;

module.exports.upload = (fileRepository, fileRecordRepository, encryptionService) => {
    const handler = async (event) => {
        try {
            const {filename, password} = JSON.parse(event.body);

            const generatedUUID = uuidv4();

            const hashedPassword = await encryptionService.hash(password)

            await fileRecordRepository.add(TABLE_NAME,
                {
                    id: generatedUUID, filename: filename, hashedPassword: hashedPassword,
                    status: 'pending_upload', createdAt: new Date().getTime()
                }
            )

            const uploadUrl = await fileRepository.generateUploadUrl({key: `uploads/${generatedUUID}/${filename}`})

            return {
                statusCode: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    id: generatedUUID,
                    uploadUrl: uploadUrl,
                }),
            };

        } catch (error) {
            return {
                statusCode: 500,
                contentType: "application/json",
                body: JSON.stringify(
                    {message: "Upload failed.", error: error.message}
                )
            }
        }
    }

    return {handler};
};
