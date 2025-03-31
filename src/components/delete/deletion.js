const TABLE_NAME = process.env.DYNAMODB_TABLE;

module.exports.deletion = (fileRepository, fileRecordRepository, encryptionService) => {
    const handler = async (event) => {
        try {
            const {uuid, password} = JSON.parse(event.body);

            const record = await fileRecordRepository.get(TABLE_NAME, {id: uuid});

            if (!record) {
                return {statusCode: 404};
            }

            const isMatch = await encryptionService.compare(password, record.hashedPassword)
            if (!isMatch) {
                return {statusCode: 400, body: JSON.stringify({reason: "Passwords don't match."})};
            }

            if (record.status !== "encrypted" && record.status !== "decrypted") {
                return {statusCode: 403, body: JSON.stringify({reason: "File can't be deleted."})};
            } else {
                await fileRecordRepository.delete(TABLE_NAME, {id: uuid});
                await fileRepository.delete({key: `${record.status}/${uuid}/${record.filename}`})
            }

            return {
                statusCode: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    id: uuid,
                }),
            };

        } catch (error) {
            return {
                statusCode: 500,
                contentType: "application/json",
                body: JSON.stringify(
                    {message: "Deletion failed.", error: error.message}
                )
            }
        }
    }

    return {handler};
};
