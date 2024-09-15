const {PassThrough} = require("node:stream");

const TABLE_NAME = process.env.DYNAMODB_TABLE;

module.exports.encrypt = (fileRepository, fileRecordRepository, encryptionService) => {

    const handler = async (event) => {
        console.log('S3 Event:', JSON.stringify(event, null, 2));

        try {
            for (const record of event.Records) {
                const key = record.s3.object.key;
                const uuid = key.split('/')[1];

                const fileRecord = await fileRecordRepository.get(TABLE_NAME, {id: uuid})

                let hashedPassword = fileRecord.hashedPassword;

                const file = await fileRepository.get({ key: key});
                const {cipher, iv, salt} = await encryptionService.encrypt(hashedPassword);
                const passThrough = new PassThrough()

                file.Body.on('error', (err) => console.error('Error in S3 Object stream:', err));
                cipher.on('error', (err) => console.error('Error in Cipher stream:', err));
                passThrough.on('error', (err) => console.error('Error in PassThrough stream:', err));

                file.Body.pipe(cipher).pipe(passThrough);

                await fileRepository.add({
                    key: key.replace('uploads/', 'encrypted/'),
                    body: passThrough
                })

                await Promise.all([
                    fileRecordRepository.update(TABLE_NAME, uuid, "status", "finished"),
                    fileRecordRepository.update(TABLE_NAME, uuid, "encryption_iv", iv),
                    fileRecordRepository.update(TABLE_NAME, uuid, "encryption_salt", salt)
                ])

                await fileRepository.delete({ key: key })

                console.log(`File processed and encrypted successfully: ${key}`);
            }
        } catch (error) {
            console.error('Error processing uploaded file:', error);
        }
    }

    return { handler }
}