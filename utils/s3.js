const {
    GetObjectCommand,
    S3Client, PutObjectCommand, DeleteObjectCommand
} = require("@aws-sdk/client-s3");
const {Upload} = require('@aws-sdk/lib-storage');

const {getSignedUrl} = require("@aws-sdk/s3-request-presigner");

const client = new S3Client();

module.exports.generateUploadPreSignedUrl = async ({bucket, key}) => {
    const command = new PutObjectCommand({Bucket: bucket, Key: key});
    return getSignedUrl(client, command, {expiresIn: 3600});
}

module.exports.generateDownloadPreSignedUrl = async ({bucket, key}) => {
    const command = new GetObjectCommand({Bucket: bucket, Key: key});
    return getSignedUrl(client, command, {expiresIn: 3600});
}

module.exports.getS3Object = async ({bucket, key}) => {
    try {
        const params = {
            Bucket: bucket,
            Key: key,
        };

        let getObjectCommand = new GetObjectCommand(params);
        return await client.send(getObjectCommand);
    } catch (error) {
        console.error('Error sending S3 get command:', error);
        throw new Error('Failed to retrieve object from S3');
    }
};

module.exports.uploadToS3 = async ({ bucket, key, body }) => {
    try {
        const upload = new Upload({
            client: client,
            params: {
                Bucket: bucket,
                Key: key,
                Body: body,
            }
        });

        await upload.done();
        console.log(`File uploaded successfully: ${key}`);
    } catch (err) {
        console.error('Error uploading to S3:', err);
        throw new Error('Could not upload file to S3');
    }
};

module.exports.deleteFromS3 = async ({bucket, key}) => {
    const command = new DeleteObjectCommand({Bucket: bucket, Key: key});
    await client.send(command)
    console.log(`File deleted successfully: ${key}`);
}