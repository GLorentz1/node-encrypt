const {PassThrough} = require("node:stream");

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

            const file = await fileRepository.get({key: `encrypted/${key}`})
            const decipher = await encryptionService.decrypt(
                record.hashedPassword,
                Buffer.from(record.encryption_salt, 'hex'),
                Buffer.from(record.encryption_iv, 'hex')
            );
            const passThrough = new PassThrough();

            file.Body.on('error', (err) => console.error('Error in S3 Object stream:', err));
            decipher.on('error', (err) => console.error('Error in decipher stream:', err));
            passThrough.on('error', (err) => console.error('Error in PassThrough stream:', err));

            file.Body.pipe(decipher).pipe(passThrough)

            await fileRepository.add({
                key: `decrypted/${key}`,
                body: passThrough
            })

            let downloadUrl = await fileRepository.generateDownloadUrl({key: `decrypted/${key}`});

            await fileRepository.delete({key: `encrypted/${key}`})

            console.log(`File processed and decrypted successfully: ${key}`);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    downloadUrl: downloadUrl
                }),
            };
        } catch (error) {
            console.log('Error decrypt:', error);
        }
    }

    return {handler};
}