const TABLE_NAME = process.env.DYNAMODB_TABLE;

module.exports.update = (fileRepository, fileRecordRepository, encryptionService) => {
    const handler = async (event) => {
        try {
            const {uuid, filename, password} = JSON.parse(event.body);

            if (!filename) {
                return {statusCode: 400, body: JSON.stringify({reason: "Field is missing: filename."})};
            }

            const record = await fileRecordRepository.get(TABLE_NAME, {id: uuid});

            const isMatch = await encryptionService.compare(password, record.hashedPassword)
            if (!isMatch) {
                return {statusCode: 400, body: JSON.stringify({reason: "Passwords don't match."})};
            }

            if (record.status !== "encrypted") {
                return {statusCode: 403, body: JSON.stringify({reason: "File can't be updated."})};
            }

            await fileRecordRepository.update(TABLE_NAME, uuid, {"filename": filename, "status": "pending_upload"});

            const uploadUrl = await fileRepository.generateUploadUrl({key: `uploads/${uuid}/${filename}`})
            await fileRepository.delete({key: `encrypted/${uuid}/${record.filename}`})

            return {
                statusCode: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    id: uuid,
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
