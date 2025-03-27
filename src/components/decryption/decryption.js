const {PassThrough} = require("node:stream");

const TABLE_NAME = process.env.DYNAMODB_TABLE;

module.exports.decrypt = (fileRepository, fileRecordRepository, encryptionService) => {

    const handler = async (event) => {
        console.log('S3 Event:', JSON.stringify(event, null, 2));

        try {
            for (const record of event.Records) {
                const key = record.s3.object.key;
                const uuid = key.split('/')[1];

                await fileRecordRepository.update(TABLE_NAME, uuid, "status", "decrypting")

                const fileRecord = await fileRecordRepository.get(TABLE_NAME, {id: uuid})

                const file = await fileRepository.get({key: key})
                const decipher = await encryptionService.decrypt(
                    fileRecord.hashedPassword,
                    Buffer.from(fileRecord.encryption_salt, 'hex'),
                    Buffer.from(fileRecord.encryption_iv, 'hex')
                );
                const passThrough = new PassThrough();

                file.Body.on('error', (err) => console.error('Error in S3 Object stream:', err));
                decipher.on('error', (err) => console.error('Error in decipher stream:', err));
                passThrough.on('error', (err) => console.error('Error in PassThrough stream:', err));

                file.Body.pipe(decipher).pipe(passThrough)

                await fileRepository.add({
                    key: key.replace('to_decrypt/', 'decrypted/'),
                    body: passThrough
                })

                await fileRepository.delete({ key: key })

                await fileRecordRepository.update(TABLE_NAME, uuid, "status", "decrypted")
            }
        } catch (error) {
            console.error('Error decrypting file:', error);
        }
    }

    return { handler }
}