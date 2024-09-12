const {v4: uuidv4} = require('uuid');
const bcrypt = require('bcryptjs');
const {PassThrough} = require("node:stream");
const {pipeline} = require('stream/promises')

const {putInDynamoDBTable, getFromDynamoDBTable, updateInDynamoDBTable} = require('../utils/db');
const {
    getS3Object, uploadToS3, deleteFromS3,
    generateUploadPreSignedUrl, generateDownloadPreSignedUrl
} = require('../utils/s3')
const {encrypt, decrypt} = require("../utils/encryption");

const TABLE_NAME = process.env.DYNAMODB_TABLE;
const BUCKET_NAME = process.env.S3_BUCKET;

module.exports.uploadStarted = async (event) => {
    try {
        const {filename, password} = JSON.parse(event.body);

        const generatedUUID = uuidv4();

        const hashedPassword = await bcrypt.hash(password, 10)

        await putInDynamoDBTable(TABLE_NAME, {
            id: generatedUUID,
            filename: filename,
            hashedPassword: hashedPassword,
            status: 'pending',
            createdAt: new Date().getTime()
        })

        const preSignedUrl = await generateUploadPreSignedUrl({
            bucket: BUCKET_NAME,
            key: "uploads/" + generatedUUID + "/" + filename
        })

        return {
            statusCode: 200,
            body: JSON.stringify({
                id: generatedUUID,
                uploadUrl: preSignedUrl,
            }),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify(
                {message: "Upload failed.", error: error.message}
            )
        }
    }

};

module.exports.uploadFinished = async (event) => {
    console.log('S3 Event:', JSON.stringify(event, null, 2));

    try {
        for (const record of event.Records) {
            const bucket = record.s3.bucket.name;
            const key = record.s3.object.key;
            const uuid = key.split('/')[1];

            const dbRecord = await getFromDynamoDBTable(TABLE_NAME, {id: uuid})
            console.log("DbRecord: ", JSON.stringify(dbRecord));

            let hashedPassword = dbRecord.hashedPassword;

            const s3Object = await getS3Object({bucket: bucket, key: key})
            const {cipher, iv, salt} = await encrypt(hashedPassword)
            const passThrough = new PassThrough()
            await pipeline(s3Object.Body, cipher, passThrough)

            await uploadToS3({
                bucket: bucket,
                key: key.replace('uploads/', 'encrypted/'),
                body: passThrough
            })

            await updateInDynamoDBTable(TABLE_NAME, uuid, "status", "finished")
            await updateInDynamoDBTable(TABLE_NAME, uuid, "encryption_iv", iv);
            await updateInDynamoDBTable(TABLE_NAME, uuid, "encryption_salt", salt);
            await deleteFromS3({bucket: bucket, key: key})

            console.log(`File processed and encrypted successfully: ${key}`);
        }
    } catch (error) {
        console.error('Error processing uploaded file:', error);
    }

}

module.exports.decrypt = async (event) => {
    try {
        const {uuid, password} = JSON.parse(event.body);

        let record = await getFromDynamoDBTable(TABLE_NAME, {id: uuid});
        let key = uuid + "/" + record.filename;

        if (!record) {
            return {statusCode: 404};
        }

        const isMatch = await bcrypt.compare(password, record.hashedPassword)
        if (!isMatch) {
            return {statusCode: 400, body: JSON.stringify({reason: "Passwords don't match."})};
        }

        const s3Object = await getS3Object({bucket: BUCKET_NAME, key: 'encrypted/' + key})
        const decipher = await decrypt(
            Buffer.from(record.encryption_salt, 'hex'),
            Buffer.from(record.encryption_iv, 'hex'),
            record.hashedPassword);
        const passThrough = new PassThrough();
        await pipeline(s3Object.Body, decipher, passThrough);

        await uploadToS3({
            bucket: BUCKET_NAME,
            key: 'decrypted/' + key,
            body: passThrough
        })

        let downloadUrl = await generateDownloadPreSignedUrl({
            bucket: BUCKET_NAME,
            key: 'decrypted/' + key
        });

        await deleteFromS3({bucket: BUCKET_NAME, key: 'encrypted/' + key})

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