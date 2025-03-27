
const TABLE_NAME = process.env.DYNAMODB_TABLE;

module.exports.download = (fileRepository, fileRecordRepository, encryptionService) => {
    const handler = async (event) => {
        try {
            const {uuid, password} = JSON.parse(event.body);

            let record = await fileRecordRepository.get(TABLE_NAME, {id: uuid});
            console.log("Record from db: " + JSON.stringify(record));

            let key = uuid + "/" + record.filename;

            if (!record) {
                return {statusCode: 404};
            }

            const isMatch = await encryptionService.compare(password, record.hashedPassword)
            if (!isMatch) {
                return {statusCode: 400, body: JSON.stringify({reason: "Passwords don't match."})};
            }

            if (record.status === "encrypted") {
                const file = await fileRepository.get({ key: `encrypted/${key}`});
                await fileRepository.add({
                    key: `to_decrypt/${key}`,
                    body: file.Body
                })

                await fileRepository.delete({ key: `encrypted/${key}` })

                return {
                    statusCode: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        message: "Decryption started."
                    }),
                };
            } else if (record.status === "decrypted") {
                let downloadUrl = await fileRepository.generateDownloadUrl({key: `decrypted/${key}`});

                return {
                    statusCode: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        message: "Decryption finished.",
                        downloadUrl: downloadUrl
                    }),
                };
            } else if (record.status === "decrypting") {
                return {
                    statusCode: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        message: "Decryption in progress."
                    }),
                };
            }
        } catch (error) {
            console.log('Error decrypt:', error);

            return {
                statusCode: 500,
                contentType: "application/json",
                body: JSON.stringify(
                    {message: "Download failed.", error: error.message}
                )
            }
        }
    }

    return {handler};
}